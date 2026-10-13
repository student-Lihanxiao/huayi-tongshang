const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const moment = require('moment-timezone');

const app = express();

// ========== 运行环境与配置 ==========
const PORT = parseInt(process.env.PORT, 10) || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';

// 数据目录可外置（云平台持久化磁盘 / Docker volume），**仅用于用户与订单等运行期数据**
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data');

// 站点内容目录（商品、文章、体质题库、界面文案）永远从应用自带目录读取。
// 这样即使持久化磁盘挂载错误或为空，站点依然能正常打开，不会整站崩溃。
const CONTENT_DIR = path.join(__dirname, 'data');

// 首次启动的播种文件目录。
// 与 content 分开的原因：users.json / orders.json 属于运行期数据、已被 .gitignore 排除，
// 不能既当"不提交的数据"又当"部署时的初始模板"。这里保留专门的 bootstrap 模板，
// 首次运行 / 空磁盘时复制到 RUNTIME_DIR，之后所有读写都只发生在 RUNTIME_DIR。
const BOOTSTRAP_DIR = path.join(__dirname, 'data', 'bootstrap');

// 运行期数据文件的真实落盘目录。
// 当 DATA_DIR 仍指向项目内 data/ 时，额外下沉到 data/runtime/，
// 避免污染仓库里的种子文件（也避免被误提交）。
const RUNTIME_DIR = path.resolve(DATA_DIR) === path.join(__dirname, 'data')
  ? path.join(__dirname, 'data', 'runtime')
  : DATA_DIR;

// 对外访问地址：用于 canonical / og:url / sitemap，末尾不留斜杠
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');

// 会话密钥：生产环境必须由环境变量提供
const SESSION_SECRET = process.env.SESSION_SECRET || 'huayi-dev-only-secret-change-me';
if (IS_PROD && !process.env.SESSION_SECRET) {
  console.warn('⚠️  生产环境未设置 SESSION_SECRET，正在使用不安全的默认值。请务必配置！');
}

// secure cookie 开关：
// 需要 HTTPS 才会带上 session cookie。云平台（Render/Railway）自带 HTTPS，可设 COOKIE_SECURE=true。
// 但如果是现场用 http://localhost 演示，必须保持 false，否则登录/购物车会静默失效。
const COOKIE_SECURE = String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true';

// 可选依赖：缺失时自动降级，不让部署因它们失败
let compression = null;
let helmet = null;
try { compression = require('compression'); } catch (e) { /* 未安装则跳过 */ }
try { helmet = require('helmet'); } catch (e) { /* 未安装则跳过 */ }

// ========== 数据目录自检 ==========
// 云平台挂载持久化磁盘后，目录可能是空的甚至挂错，这里做一次可写性检查并给出明确提示。
// 注意：这里只检查「运行期数据目录」。站点内容（商品/文章/文案）读的是应用自带目录，
//       不受磁盘状态影响，所以磁盘挂错也不会导致整站打不开。
function ensureDataDir() {
  try {
    fs.mkdirSync(RUNTIME_DIR, { recursive: true });
    const probe = path.join(RUNTIME_DIR, '.write-probe');
    fs.writeFileSync(probe, 'ok', 'utf8');
    fs.unlinkSync(probe);
    return { ok: true, dir: RUNTIME_DIR };
  } catch (err) {
    console.error(`❌ 运行期数据目录不可写：${RUNTIME_DIR}`);
    console.error(`   ${err.message}`);
    console.error('   请检查：卷是否正确挂载到该路径、或 DATA_DIR 环境变量是否指向可写目录。');
    console.error('   注：站点仍可正常访问，但注册与下单只会保存在内存中。');
    return { ok: false, dir: RUNTIME_DIR, error: err.message };
  }
}
const DATA_STATUS = ensureDataDir();

// ========== 中间件配置 ==========
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 部署在 Nginx / Render / Railway 等反向代理后面时，必须信任代理，
// 否则 req.secure / req.protocol / secure cookie 判定都会出错。
app.set('trust proxy', 1);

// 安全响应头（helmet 未安装时跳过）
if (helmet) {
  app.use(helmet({
    contentSecurityPolicy: false, // 页面内联了 bootstrap CDN 与少量内联脚本，先不启用 CSP
    crossOriginEmbedderPolicy: false
  }));
}

// gzip 压缩（compression 未安装时跳过）
if (compression) {
  app.use(compression());
}

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: IS_PROD ? '7d' : 0 // 生产环境给静态资源加缓存
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  name: 'huayi.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  proxy: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    // 仅在显式开启时要求 HTTPS（见 COOKIE_SECURE 说明）
    secure: COOKIE_SECURE,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// ========== 多语言（i18n）基础 ==========
const LANGS = ['zh', 'en', 'ja', 'ko'];
const LANG_LABELS = { zh: '中文', en: 'English', ja: '日本語', ko: '한국어' };
const HTML_LANG = { zh: 'zh-CN', en: 'en', ja: 'ja', ko: 'ko' };
const INTL_LOCALE = { zh: 'zh-CN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR' };

const locales = {};
for (const lang of LANGS) {
  // 界面文案属于代码资产，始终从应用自带目录读取，
  // 保证挂载持久化磁盘（可能是空目录）后界面文案不会丢。
  const file = path.join(CONTENT_DIR, 'locales', `${lang}.json`);
  if (!fs.existsSync(file)) throw new Error(`缺少语言文件：${file}`);
  locales[lang] = JSON.parse(fs.readFileSync(file, 'utf8'));
}

function detectLang(input) {
  if (!input) return null;
  const raw = String(input).toLowerCase();
  if (LANGS.includes(raw)) return raw;
  const base = raw.split(/[-_]/)[0];
  return LANGS.includes(base) ? base : null;
}

/**
 * 取翻译：t(lang, key[, vars])
 * 缺失时回退中文，再回退 key 本身，保证界面绝不出现空白或报错。
 */
function t(lang, key, vars) {
  let str = locales[lang] && locales[lang][key];
  if (str === undefined) str = locales.zh[key];
  if (str === undefined) return key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.split(`{${k}}`).join(String(v));
    }
  }
  return str;
}

/**
 * 候选字段名：同时支持下划线（name_ja）与驼峰（traitsJa / effectEn）两种写法，
 * 因为 products.json / articles.json 用下划线，constitution.json 用驼峰。
 */
function localizedKeys(field, lang) {
  const camel = field + lang.charAt(0).toUpperCase() + lang.slice(1);
  const keys = [`${field}_${lang}`];
  if (camel !== keys[0]) keys.push(camel);
  return keys;
}

function hasText(value) {
  return !!value && (Array.isArray(value) ? value.length > 0 : String(value).trim() !== '');
}

/**
 * 取商品/文章/体质的本地化字段。
 * 约定：
 *   - zh 直接用中文字段本身（name / traits / heritagePath）
 *   - 其他语言先找 name_ja（商品）或 nameJa（constitution.json 驼峰式）
 *   - 都缺失时回退英文，最后回退中文
 */
function loc(item, field, lang) {
  if (!item) return '';
  if (lang === 'zh') return item[field] || '';
  for (const key of localizedKeys(field, lang)) {
    if (hasText(item[key])) return item[key];
  }
  if (lang !== 'en') {
    for (const key of localizedKeys(field, 'en')) {
      if (hasText(item[key])) return item[key];
    }
  }
  return item[field] || '';
}

/** 为整批商品生成当前语言的展示副本 */
function localizeProducts(list, lang) {
  return list.map(p => ({
    ...p,
    name: loc(p, 'name', lang),
    description: loc(p, 'description', lang),
    heritage: loc(p, 'heritage', lang)
  }));
}

// 语言中间件：?lang=xx 优先，其次 session，其次中文
app.use((req, res, next) => {
  const requested = detectLang(req.query.lang);
  const accept = detectLang((req.headers['accept-language'] || '').split(',')[0]);
  let lang = requested || req.session.lang || accept || 'zh';
  if (!LANGS.includes(lang)) lang = 'zh';

  if (requested) req.session.lang = requested;
  else req.session.lang = lang;

  req.lang = lang;
  res.locals.lang = lang;
  res.locals.langs = LANGS;
  res.locals.langLabels = LANG_LABELS;
  res.locals.htmlLang = HTML_LANG[lang];
  res.locals.t = (key, vars) => t(lang, key, vars);
  res.locals.loc = (item, field) => loc(item, field, lang);
  next();
});

// ========== 全局模板变量 ==========
app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.moment = moment;
  res.locals.currentUrl = req.url;

  // ---- SEO / 社交分享的默认元信息（个别页面可在 render 时覆盖）----
  // 站点基础地址：优先 PUBLIC_URL（生产环境），否则按请求推断，本地调试也能正确生成绝对链接
  res.locals.siteUrl = PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  res.locals.metaTitle = null;                       // null 表示用页面自己的 <title>
  res.locals.metaDescription = null;                 // null 表示回退到站点级描述
  res.locals.metaImage = null;                       // null 表示用默认分享图
  res.locals.metaRobots = 'index, follow';           // 需要屏蔽收录的页面各自覆盖
  res.locals.ogType = 'website';
  next();
});

// ========== 辅助函数：数据读取 ==========
/**
 * 站点内容文件（只读）：商品、文章、体质题库 —— 永远来自应用自带目录。
 * 这些是随代码发布的资产，不受 DATA_DIR / 持久化磁盘影响。
 */
const CONTENT_FILES = new Set(['products.json', 'articles.json', 'constitution.json', 'quiz-questions.json']);

/**
 * 运行期数据文件（可写）：用户、订单 —— 放在 DATA_DIR（可挂持久化磁盘）。
 * 磁盘为空时用应用自带文件做种子；磁盘不可写时降级为内存兜底，
 * 保证站点仍能正常访问（写入会明确失败并提示，而不是整站崩溃）。
 */
const RUNTIME_FILES = new Set(['users.json', 'orders.json']);
const runtimeFallback = {}; // 磁盘不可写时的内存副本

function resolveDataFile(file) {
  if (CONTENT_FILES.has(file)) return path.join(CONTENT_DIR, file);
  if (!RUNTIME_FILES.has(file)) return path.join(CONTENT_DIR, file);

  // 运行期文件：一律落在 RUNTIME_DIR，空目录则从 bootstrap 模板播种
  const live = path.join(RUNTIME_DIR, file);
  try {
    if (fs.existsSync(live)) return live;
    const seed = path.join(BOOTSTRAP_DIR, file);
    fs.mkdirSync(RUNTIME_DIR, { recursive: true });
    if (fs.existsSync(seed)) {
      fs.copyFileSync(seed, live);
      console.log(`🌱 从模板初始化 ${file} -> ${live}`);
    } else {
      // 没有模板也要建出空文件，避免后续读取反复报错
      const empty = file === 'users.json' ? { users: [] } : { orders: [] };
      fs.writeFileSync(live, JSON.stringify(empty, null, 2) + '\n', 'utf8');
      console.log(`🌱 创建空数据文件 ${file} -> ${live}`);
    }
    return live;
  } catch (err) {
    console.warn(`⚠️  ${file} 无法在 ${RUNTIME_DIR} 初始化（${err.message}），本次运行使用内存数据`);
  }
  return live;
}

function readData(file) {
  // 磁盘不可写时，运行期文件优先读内存副本
  if (RUNTIME_FILES.has(file) && runtimeFallback[file]) return runtimeFallback[file];

  try {
    const target = resolveDataFile(file);
    return JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch (err) {
    // 运行期文件读不到不是致命错误：给空结构，站点照常运行
    if (RUNTIME_FILES.has(file)) {
      console.warn(`⚠️  读取 ${file} 失败（${err.message}），将以空数据启动`);
      const empty = file === 'users.json' ? { users: [] } : { orders: [] };
      runtimeFallback[file] = empty;
      return empty;
    }
    console.error(`读取文件 ${file} 出错:`, err.message);
    return {};
  }
}

function safeReadData(file, key = 'products') {
  const data = readData(file);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[key])) return data[key];
  return [];
}

/**
 * 统一 UTF-8 写回（避免历史上出现过的 GBK 乱码问题）。
 * 返回 { ok, error }，调用方据此给用户明确提示，而不是抛异常或 500。
 * 磁盘不可写时保留内存副本，保证本次运行期间数据仍可用。
 */
function writeData(file, key, list) {
  const doc = { [key]: list };
  runtimeFallback[file] = doc; // 先落内存，保证读一致性

  const target = path.join(RUNTIME_DIR, file);
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    // 先写临时文件再原子重命名，避免写入中断导致 JSON 损坏
    const tmp = `${target}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(doc, null, 2) + '\n', 'utf8');
    fs.renameSync(tmp, target);
    return { ok: true };
  } catch (err) {
    console.error(`写入 ${file} 失败（数据仅保留在内存，重启会丢失）:`, err.message);
    return { ok: false, error: err.message };
  }
}

const constitutionData = readData('constitution.json');
const quizData = readData('quiz-questions.json');
const CONSTITUTION_TYPES = constitutionData.types || [];
const TYPE_BY_KEY = {};
CONSTITUTION_TYPES.forEach(type => { TYPE_BY_KEY[type.key] = type; });
const PRODUCT_PROFILE = constitutionData.productProfile || { primary: {}, lifestyle: {} };

// ========== 获取24节气信息 ==========
const TERM_MAP = [
  { month: 2, day: 4, key: 'lichun' },
  { month: 2, day: 19, key: 'yushui' },
  { month: 3, day: 5, key: 'jingzhe' },
  { month: 3, day: 20, key: 'chunfen' },
  { month: 4, day: 4, key: 'qingming' },
  { month: 4, day: 20, key: 'guyu' },
  { month: 5, day: 5, key: 'lixia' },
  { month: 5, day: 21, key: 'xiaoman' },
  { month: 6, day: 5, key: 'mangzhong' },
  { month: 6, day: 21, key: 'xiazhi' },
  { month: 7, day: 7, key: 'xiaoshu' },
  { month: 7, day: 23, key: 'dashu' },
  { month: 8, day: 7, key: 'liqiu' },
  { month: 8, day: 23, key: 'chushu' },
  { month: 9, day: 7, key: 'bailu' },
  { month: 9, day: 23, key: 'qiufen' },
  { month: 10, day: 8, key: 'hanlu' },
  { month: 10, day: 23, key: 'shuangjiang' },
  { month: 11, day: 7, key: 'lidong' },
  { month: 11, day: 22, key: 'xiaoxue' },
  { month: 12, day: 7, key: 'daxue' },
  { month: 12, day: 21, key: 'dongzhi' },
  { month: 1, day: 5, key: 'xiaohan' },
  { month: 1, day: 20, key: 'dahan' }
];

function getSolarTermInfo(lang) {
  const today = moment().tz('Asia/Shanghai');
  const month = parseInt(today.format('M'), 10);
  const day = parseInt(today.format('D'), 10);

  let currentKey = 'lichun';
  for (let i = 0; i < TERM_MAP.length; i++) {
    const term = TERM_MAP[i];
    if (month === term.month && day >= term.day) { currentKey = term.key; break; }
    if (month < term.month || (month === term.month && day < term.day)) {
      currentKey = TERM_MAP[(i - 1 + TERM_MAP.length) % TERM_MAP.length].key;
      break;
    }
  }

  const order = TERM_MAP.map(x => x.key);
  const nextKey = order[(order.indexOf(currentKey) + 1) % order.length];

  // 本地化日期：统一用 Intl 输出各语言的日期与星期
  // （注意：不能依赖 moment().format('dddd')，moment 的默认 locale 是 en，
  //   会让中文页面出现「2026年10月13日 Tuesday」这种中英混排。）
  const parts = new Intl.DateTimeFormat(INTL_LOCALE[lang], {
    year: 'numeric',
    month: lang === 'zh' ? 'numeric' : 'long',
    day: 'numeric',
    weekday: lang === 'zh' || lang === 'ko' ? 'long' : 'short'
  }).formatToParts(new Date(today.valueOf()));

  const pick = (type) => (parts.find(p => p.type === type) || {}).value || '';
  // 注意：中文的「年/月/日」是 literal 部件，必须一并拼接，否则会退化成纯数字。
  // 同时要把 weekday 部件从基础日期里剔除，再单独追加，避免重复。
  const dateOnly = parts.filter(p => p.type !== 'weekday').map(p => p.value).join('').trim();
  const dateText = lang === 'zh'
    ? `${dateOnly} ${pick('weekday')}`
    : parts.map(p => p.value).join('').replace(/\s+/g, ' ').trim();

  return {
    key: currentKey,
    term: t(lang, `solar.term.${currentKey}`),
    nextKey,
    nextTerm: t(lang, `solar.term.${nextKey}`),
    healthTips: t(lang, `solar.tip.${currentKey}`),
    date: dateText
  };
}

// ============================================================
//  体质测评：打分与推荐引擎
// ============================================================
const MAX_TYPE_SCORE = constitutionData.maxTypeScore || 200;
const QUIZ_THRESHOLDS = (quizData.scale && quizData.scale.thresholds) || { yes: 40, tendency: 30 };

function emptyScores() {
  const scores = {};
  CONSTITUTION_TYPES.forEach(type => { scores[type.key] = 0; });
  return scores;
}

/** 完整 18 题：每型 2 题，原始分 0-8 -> 转化分 0-100 */
function scoreFullQuiz(answers) {
  const buckets = emptyScores();
  const counts = {};
  CONSTITUTION_TYPES.forEach(type => { counts[type.key] = 0; });

  for (const question of quizData.full.questions) {
    const raw = answers[question.id];
    const value = Number.isFinite(Number(raw)) ? Math.min(4, Math.max(0, Number(raw))) : 0;
    buckets[question.type] += value;
    counts[question.type] += 1;
  }

  const scores = {};
  for (const key of Object.keys(buckets)) {
    const n = counts[key] || 1;
    scores[key] = Math.round(((buckets[key] - n) / (n * 4)) * 1000) / 10;
  }
  return scores;
}

/**
 * 快速测评（5 题）：按答案权重累加。
 * 每题选项的权重已按证据强度标定（3/2/1），累加后直接比较绝对值，
 * 不做「除以自身满分」的归一化，否则权重小的类型被放大后会造成误判。
 * 展示用分数按本次最高分归一化到 0-100。
 */
function scoreWeightedQuiz(questions, answers) {
  const buckets = emptyScores();
  questions.forEach(question => {
    const picked = answers[question.id];
    const option = (question.answers || []).find(a => String(a.value) === String(picked));
    if (!option || !option.scores) return;
    for (const [key, weight] of Object.entries(option.scores)) {
      if (key in buckets) buckets[key] += weight;
    }
  });

  const peak = Math.max(0.0001, ...Object.values(buckets));
  const scores = {};
  for (const [key, value] of Object.entries(buckets)) {
    scores[key] = Math.round((value / peak) * 1000) / 10;
  }
  return scores;
}

/** 排序体质：主导 + 兼夹 */
function rankConstitutions(scores) {
  const ranked = Object.entries(scores)
    .map(([key, score]) => ({ key, score, type: TYPE_BY_KEY[key] }))
    .filter(x => x.type)
    .sort((a, b) => b.score - a.score);

  const primary = ranked[0];
  const secondary = ranked
    .slice(1)
    .filter(x => x.score >= QUIZ_THRESHOLDS.tendency && x.score > 0)
    .slice(0, 2);

  return {
    ranked,
    primary,
    secondary,
    judged: ranked.map(x => ({
      ...x,
      level: x.score >= QUIZ_THRESHOLDS.yes ? 'yes'
        : x.score >= QUIZ_THRESHOLDS.tendency ? 'tendency' : 'no'
    }))
  };
}

/**
 * 商品匹配打分
 * 养生商品：主导体质 +50 / 兼夹 +25，并按「专精程度」加权
 *   —— 只针对 1 种体质的商品比覆盖 4 种的通用商品更贴合，避免通用款挤掉精准款。
 * 非遗汉服：气质契合主导 +30 / 兼夹 +15，作为第二层推荐。
 */
const SPECIFICITY = { 1: 1.5, 2: 1.2, 3: 1.0 };
const specificityOf = (count) => SPECIFICITY[count] || 0.8;

function recommendProducts(products, primaryKey, secondaryKeys, maxPrice) {
  const limit = maxPrice || Infinity;
  const pool = products.filter(p => p.price <= limit);

  const healthMatches = [];
  const lifestyleMatches = [];

  for (const product of pool) {
    const id = String(product.id);
    const profile = PRODUCT_PROFILE.primary[id];
    if (profile) {
      let score = 0;
      if (profile.types.includes(primaryKey)) score += 50;
      if (secondaryKeys.some(k => profile.types.includes(k))) score += 25;
      if (score > 0) {
        score = Math.round(score * specificityOf(profile.types.length));
        healthMatches.push({ product, score, profile });
      }
      continue;
    }

    const style = PRODUCT_PROFILE.lifestyle[id];
    if (style) {
      let score = 0;
      if (style.matchTypes.includes(primaryKey)) score += 30;
      if (secondaryKeys.some(k => style.matchTypes.includes(k))) score += 15;
      if (score > 0) lifestyleMatches.push({ product, score, profile: style });
    }
  }

  healthMatches.sort((a, b) => b.score - a.score || a.product.price - b.product.price);
  lifestyleMatches.sort((a, b) => b.score - a.score || a.product.price - b.product.price);

  const maxHealth = healthMatches.length ? healthMatches[0].score : 1;
  const maxLife = lifestyleMatches.length ? lifestyleMatches[0].score : 1;

  const decorate = (list, max, cap) => list.slice(0, cap).map(item => ({
    product: item.product,
    score: item.score,
    match: Math.min(99, Math.round((item.score / max) * 96) + 3),
    profile: item.profile
  }));

  const health = decorate(healthMatches, maxHealth, 8);
  const lifestyle = decorate(lifestyleMatches, maxLife, 6);

  // 养生商品不足时用非遗/汉服补齐，保证结果页永远有推荐
  const extras = health.length >= 4 ? [] : decorate(
    lifestyleMatches.filter(x => !health.some(h => h.product.id === x.product.id)),
    maxLife,
    4
  );

  return {
    health: health.length ? health : extras,
    lifestyle: health.length ? lifestyle : lifestyle.slice(extras.length)
  };
}

/** 依据推荐结果给出可读的调养理由 */
function buildReason(type, lang, recommendations) {
  const path = loc(type, 'heritagePath', lang);
  const count = recommendations.length;
  if (lang === 'zh') return `${path}（本次为你匹配 ${count} 件调养好物）`;
  if (lang === 'ja') return `${path}（今回は${count}点をマッチングしました）`;
  if (lang === 'ko') return `${path}（이번에 ${count}개의 아이템을 매칭했습니다）`;
  return `${path} (${count} items matched for you this time)`;
}

// ========== 首页 ==========
app.get('/', (req, res) => {
  const lang = req.lang;
  const allProducts = safeReadData('products.json', 'products');
  const products = localizeProducts(allProducts, lang);
  const articles = safeReadData('articles.json', 'articles').map(a => ({
    ...a,
    title: loc(a, 'title', lang),
    content: loc(a, 'content', lang)
  }));

  const healthProducts = products.filter(p => p.category === '养生').slice(0, 4);
  const heritageProducts = products.filter(p => p.category === '非遗').slice(0, 4);
  const hanfuProducts = products.filter(p => p.category === '汉服').slice(0, 4);
  const solarTerm = getSolarTermInfo(lang);

  const todayRecommend = products[Math.floor(Math.random() * products.length)];
  const lastQuiz = req.session.quizResult || null;

  res.render('index', {
    products,
    healthProducts,
    heritageProducts,
    hanfuProducts,
    articles: articles.slice(0, 3),
    solarTerm,
    todayRecommend,
    lastQuiz,
    showEntryQuiz: !req.session.entryQuizDone,
    entrySteps: quizData.entry ? quizData.entry.steps : []
  });
});

// ========== 进站引导小测完成标记 ==========
app.post('/entry-quiz/done', (req, res) => {
  req.session.entryQuizDone = true;
  res.json({ ok: true });
});

// ========== 体质测评入口 ==========
app.get('/quiz', (req, res) => {
  res.render('quiz', {
    metaDescription: t(req.lang, 'meta.quizDescription'),
    quizDataTypes: CONSTITUTION_TYPES,
    quickMeta: quizData.quick,
    fullCount: quizData.full.questions.length
  });
});

// 快速测评（5 题）
app.get('/quiz/quick', (req, res) => {
  res.render('quiz-quick', {
    metaDescription: t(req.lang, 'meta.quizDescription'),
    questions: quizData.quick.questions,
    options: quizData.scale.options
  });
});

// 完整测评（18 题）
app.get('/quiz/full', (req, res) => {
  res.render('quiz-full', {
    metaDescription: t(req.lang, 'meta.quizDescription'),
    questions: quizData.full.questions,
    options: quizData.scale.options,
    allTypes: CONSTITUTION_TYPES
  });
});

// 提交测评 -> 计算体质 -> 存 session -> 跳结果页
app.post('/quiz/submit', (req, res) => {
  const lang = req.lang;
  const mode = req.body.mode === 'full' ? 'full' : 'quick';
  const answers = req.body.answers && typeof req.body.answers === 'object' ? req.body.answers : {};

  const scores = mode === 'full'
    ? scoreFullQuiz(answers)
    : scoreWeightedQuiz(quizData.quick.questions, answers);

  const ranked = rankConstitutions(scores);
  const secondaryKeys = ranked.secondary.map(s => s.key);

  req.session.quizResult = {
    mode,
    scores,
    primaryKey: ranked.primary ? ranked.primary.key : 'pinghe',
    secondaryKeys,
    answeredAt: new Date().toISOString()
  };

  res.redirect('/quiz/result');
});

// 结果页
app.get('/quiz/result', (req, res) => {
  const stored = req.session.quizResult;
  if (!stored) return res.redirect('/quiz');

  const lang = req.lang;
  const allProducts = safeReadData('products.json', 'products');
  const ranked = rankConstitutions(stored.scores);
  const primary = TYPE_BY_KEY[stored.primaryKey] || ranked.primary.type;
  const secondary = stored.secondaryKeys.map(k => TYPE_BY_KEY[k]).filter(Boolean);

  const budget = req.session.entryBudget || null;
  const recommendations = recommendProducts(allProducts, stored.primaryKey, stored.secondaryKeys, budget);

  const present = (item) => ({
    ...item,
    product: {
      ...item.product,
      name: loc(item.product, 'name', lang),
      description: loc(item.product, 'description', lang),
      heritage: loc(item.product, 'heritage', lang)
    },
    effect: item.profile && item.profile.effect ? loc(item.profile, 'effect', lang) : ''
  });

  res.render('quiz-result', {
    metaRobots: 'noindex, follow',
    mode: stored.mode,
    primary,
    secondary,
    ranked: ranked.judged.map(x => ({
      key: x.key,
      score: x.score,
      level: x.level,
      name: loc(x.type, 'name', lang),
      icon: x.type.icon,
      isPrimary: x.key === stored.primaryKey
    })),
    recommendations: recommendations.health.map(present),
    lifestyle: recommendations.lifestyle.map(present),
    reason: buildReason(primary, lang, recommendations.health),
    answeredAt: stored.answeredAt
  });
});

// ========== 进站引导小测：3 步 -> 直接出结果 ==========
app.post('/quiz/entry', (req, res) => {
  const steps = quizData.entry.steps;
  const answers = req.body;

  // 分步计分：
  //  - 第 1 步「调养目标」权重 1.0 —— 用户明确说出的诉求，必须主导判定
  //  - 第 2 步「调养方式」权重 0.05 —— 仅作为同分时的倾向性微调
  //  - 第 3 步「价位」权重 0 —— 只做预算过滤，不参与体质判定
  //
  // 关键：分数不做「除以自身满分」的归一化。
  // 目标题的选项权重本身就是按证据强度标定的（3/2/1），
  // 若再按各类型自身满分归一化，权重小的类型会被放大成满分
  // （例如阴虚只在「睡不好」里得 2 分，一除就变 100，反而盖过真正对应的气郁）。
  const STEP_WEIGHT = { goal: 1, scene: 0.05, budget: 0 };

  const combined = emptyScores();
  let maxPrice = null;

  for (const step of steps) {
    const picked = answers[step.key];
    const option = step.options.find(o => String(o.value) === String(picked));
    if (!option) continue;

    if (option.maxPrice) maxPrice = option.maxPrice;

    const weight = step.key in STEP_WEIGHT ? STEP_WEIGHT[step.key] : 1;
    if (weight <= 0 || !option.scores) continue;

    for (const [key, value] of Object.entries(option.scores)) {
      if (key in combined) combined[key] += value * weight;
    }
  }

  // 转成 0-100 分制便于复用统一判定阈值（按本次最高分归一，仅用于展示与阈值）
  const peak = Math.max(0.0001, ...Object.values(combined));
  const scores = {};
  for (const [key, value] of Object.entries(combined)) {
    scores[key] = Math.round((value / peak) * 1000) / 10;
  }

  const ranked = rankConstitutions(scores);

  req.session.entryQuizDone = true;
  req.session.entryBudget = maxPrice;
  req.session.quizResult = {
    mode: 'entry',
    scores,
    primaryKey: ranked.primary ? ranked.primary.key : 'pinghe',
    secondaryKeys: ranked.secondary.map(s => s.key),
    answeredAt: new Date().toISOString()
  };

  res.redirect('/quiz/result');
});

// ========== 商品列表页 ==========
app.get('/products', (req, res) => {
  const lang = req.lang;
  const allProducts = localizeProducts(safeReadData('products.json', 'products'), lang);
  const category = req.query.category || 'all';

  let filteredProducts = allProducts;
  let titleKey = 'products.allTitle';

  if (category === '养生') {
    filteredProducts = allProducts.filter(p => p.category === '养生');
    titleKey = 'products.healthTitle';
  } else if (category === '非遗') {
    filteredProducts = allProducts.filter(p => p.category === '非遗');
    titleKey = 'products.heritageTitle';
  } else if (category === '汉服') {
    filteredProducts = allProducts.filter(p => p.category === '汉服');
    titleKey = 'products.hanfuTitle';
  }

  res.render('products', {
    products: filteredProducts,
    currentCategory: category,
    pageTitle: t(lang, titleKey),
    total: filteredProducts.length,
    metaDescription: t(lang, 'meta.productsDescription', { n: filteredProducts.length })
  });
});

// ========== 商品详情 ==========
app.get('/product/:id', (req, res) => {
  const lang = req.lang;
  const allProducts = safeReadData('products.json', 'products');
  const raw = allProducts.find(p => p.id == req.params.id);
  if (!raw) return res.redirect('/products');

  const product = localizeProducts([raw], lang)[0];
  const relatedProducts = localizeProducts(
    allProducts.filter(p => p.category === raw.category && p.id != raw.id).slice(0, 4),
    lang
  );

  res.render('product', {
    product,
    relatedProducts,
    metaTitle: product.name,
    metaDescription: (product.description || '').slice(0, 150),
    metaImage: product.image,
    ogType: 'article'
  });
});

// ========== 科普文章 ==========
app.get('/articles', (req, res) => {
  const lang = req.lang;
  const articles = safeReadData('articles.json', 'articles').map(a => ({
    ...a,
    title: loc(a, 'title', lang),
    content: loc(a, 'content', lang)
  }));
  res.render('articles', { articles, metaDescription: t(lang, 'meta.articlesDescription') });
});

app.get('/article/:id', (req, res) => {
  const lang = req.lang;
  const raw = safeReadData('articles.json', 'articles').find(a => a.id == req.params.id);
  if (!raw) return res.redirect('/articles');
  const localizedArticle = {
    ...raw,
    title: loc(raw, 'title', lang),
    content: loc(raw, 'content', lang)
  };
  res.render('article', {
    article: localizedArticle,
    metaTitle: localizedArticle.title,
    metaDescription: (localizedArticle.content || '').replace(/\s+/g, ' ').slice(0, 150),
    ogType: 'article'
  });
});

// ========== 用户认证 ==========
app.get('/register', (req, res) => {
  res.render('register', { redirect: req.query.redirect || '/', error: null, metaRobots: 'noindex, follow' });
});

app.post('/register', async (req, res) => {
  const { username, password, redirect } = req.body;
  const users = safeReadData('users.json', 'users');

  if (users.find(u => u.username === username)) {
    return res.render('register', { redirect: redirect || '/', error: t(req.lang, 'register.exists'), metaRobots: 'noindex, follow' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: users.length ? Math.max(...users.map(u => u.id)) + 1 : 1,
    username,
    password: hashedPassword,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  const saved = writeData('users.json', 'users', users);
  if (!saved.ok) {
    // 磁盘不可写时明确失败，而不是假装注册成功后数据消失
    console.error('注册失败：用户数据无法持久化');
    return res.status(500).render('register', {
      redirect: redirect || '/',
      error: t(req.lang, 'register.storageError')
    });
  }

  req.session.user = { id: newUser.id, username };
  res.redirect(redirect || '/');
});

app.get('/login', (req, res) => {
  res.render('login', { redirect: req.query.redirect || '/', error: null, metaRobots: 'noindex, follow' });
});

app.post('/login', async (req, res) => {
  const { username, password, redirect } = req.body;
  const users = safeReadData('users.json', 'users');
  const user = users.find(u => u.username === username);

  if (user && await bcrypt.compare(password, user.password)) {
    req.session.user = { id: user.id, username };
    res.redirect(redirect || '/');
  } else {
    res.render('login', { redirect: redirect || '/', error: t(req.lang, 'login.error'), metaRobots: 'noindex, follow' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// ========== 购物车 ==========
app.post('/cart/add', (req, res) => {
  const { productId, quantity } = req.body;
  const lang = req.lang;
  const products = safeReadData('products.json', 'products');
  const raw = products.find(p => p.id == productId);

  if (!raw) return res.redirect('/products');

  if (!req.session.cart) req.session.cart = [];

  const existing = req.session.cart.find(item => item.id == productId);
  if (existing) {
    existing.quantity += parseInt(quantity, 10);
  } else {
    // 购物车名称存中文原值，展示时按当前语言实时翻译
    req.session.cart.push({
      id: raw.id,
      name: raw.name,
      category: raw.category,
      price: raw.price,
      image: raw.image,
      heritage: raw.heritage,
      quantity: parseInt(quantity, 10)
    });
  }

  res.redirect('/cart');
});

/** 购物车项按当前语言展示（从商品主数据取本地化字段） */
function localizeCart(cart, lang) {
  const products = safeReadData('products.json', 'products');
  return cart.map(item => {
    const master = products.find(p => p.id == item.id);
    return {
      ...item,
      name: master ? loc(master, 'name', lang) : item.name,
      heritage: master ? loc(master, 'heritage', lang) : item.heritage
    };
  });
}

app.get('/cart', (req, res) => {
  const cart = localizeCart(req.session.cart || [], req.lang);
  let total = 0;
  cart.forEach(item => { total += item.price * item.quantity; });
  res.render('cart', { cart, total, metaRobots: 'noindex, follow' });
});

app.get('/cart/remove/:id', (req, res) => {
  if (req.session.cart) {
    req.session.cart = req.session.cart.filter(item => item.id != req.params.id);
  }
  res.redirect('/cart');
});

app.get('/cart/update/:id/:delta', (req, res) => {
  const id = req.params.id;
  const delta = parseInt(req.params.delta, 10);

  if (req.session.cart) {
    const item = req.session.cart.find(i => i.id == id);
    if (item) {
      item.quantity += delta;
      if (item.quantity <= 0) {
        req.session.cart = req.session.cart.filter(i => i.id != id);
      }
    }
  }
  res.redirect('/cart');
});

// ========== 结账 ==========
app.get('/checkout', (req, res) => {
  if (!req.session.user) {
    const redirect = encodeURIComponent('/checkout');
    return res.redirect(`/login?redirect=${redirect}`);
  }

  const cart = localizeCart(req.session.cart || [], req.lang);
  if (cart.length === 0) return res.redirect('/products');

  let total = 0;
  cart.forEach(item => { total += item.price * item.quantity; });

  res.render('checkout', { cart, total, metaRobots: 'noindex, follow' });
});

app.post('/checkout', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const { name, phone, address, note } = req.body;
  const cart = req.session.cart || [];
  if (cart.length === 0) return res.redirect('/products');

  const orders = safeReadData('orders.json', 'orders');
  const localizedCart = localizeCart(cart, req.lang);
  const newOrder = {
    id: orders.length ? Math.max(...orders.map(o => o.id)) + 1 : 1,
    userId: req.session.user.id,
    userName: req.session.user.username,
    items: cart,
    total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    recipientName: name,
    phone,
    address,
    note: note || '',
    status: '待发货',
    lang: req.lang,
    createdAt: new Date().toISOString()
  };

  orders.push(newOrder);
  const saved = writeData('orders.json', 'orders', orders);
  if (!saved.ok) {
    // 磁盘不可写时不要把购物车清空，用户数据不能丢
    console.error('下单失败：订单数据无法持久化');
    return res.status(500).render('checkout', {
      cart: localizedCart,
      total: newOrder.total,
      error: t(req.lang, 'checkout.storageError')
    });
  }

  req.session.cart = [];
  res.render('order-success', {
    order: newOrder,
    items: localizedCart,
    statusText: t(req.lang, 'orderSuccess.statusPending')
  });
});

// ========== Footer页面路由 ==========
app.get('/about', (req, res) => {
  res.render('about');
});

app.get('/contact', (req, res) => {
  res.render('contact');
});

app.get('/join', (req, res) => {
  res.render('join');
});

app.get('/faq', (req, res) => {
  res.render('faq');
});

app.get('/shipping', (req, res) => {
  res.render('shipping');
});

app.get('/returns', (req, res) => {
  res.render('returns');
});

app.get('/solar-terms', (req, res) => {
  const lang = req.lang;
  const info = getSolarTermInfo(lang);
  const allTerms = TERM_MAP.map(item => ({
    key: item.key,
    term: t(lang, `solar.term.${item.key}`),
    tip: t(lang, `solar.tip.${item.key}`),
    isCurrent: item.key === info.key
  }));
  res.render('solar-terms', { solarTerm: info, allTerms });
});

// ========== 运维与 SEO 端点 ==========
// 健康检查：云平台用它判断实例是否就绪
app.get('/healthz', (req, res) => {
  res.json({
    ok: true,
    env: NODE_ENV,
    uptime: Math.round(process.uptime()),
    dataDir: RUNTIME_DIR,
    contentDir: CONTENT_DIR,
    dataWritable: DATA_STATUS.ok,
    products: safeReadData('products.json', 'products').length,
    articles: safeReadData('articles.json', 'articles').length,
    node: process.version
  });
});

// 站点基础地址：优先环境变量，其次按请求推断（便于本地与云端都能正常工作）
function baseUrl(req) {
  if (PUBLIC_URL) return PUBLIC_URL;
  return `${req.protocol}://${req.get('host')}`;
}

app.get('/robots.txt', (req, res) => {
  const base = baseUrl(req);
  res.type('text/plain').send(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /cart',
      'Disallow: /checkout',
      'Disallow: /login',
      'Disallow: /register',
      'Disallow: /quiz/result',
      'Disallow: /entry-quiz/',
      '',
      `Sitemap: ${base}/sitemap.xml`,
      ''
    ].join('\n')
  );
});

app.get('/sitemap.xml', (req, res) => {
  const base = baseUrl(req);
  const urls = [];
  const today = new Date().toISOString().slice(0, 10);

  const add = (loc, priority, changefreq) => urls.push({ loc: `${base}${loc}`, priority, changefreq, lastmod: today });

  // 核心页面
  add('/', '1.0', 'daily');
  add('/quiz', '0.9', 'monthly');
  add('/quiz/full', '0.7', 'monthly');
  add('/quiz/quick', '0.7', 'monthly');
  add('/products', '0.9', 'daily');
  add('/products?category=养生', '0.8', 'weekly');
  add('/products?category=非遗', '0.8', 'weekly');
  add('/products?category=汉服', '0.8', 'weekly');
  add('/articles', '0.8', 'weekly');
  add('/features', '0.7', 'monthly');
  add('/solar-terms', '0.6', 'weekly');
  add('/about', '0.5', 'monthly');
  add('/contact', '0.5', 'monthly');
  add('/join', '0.5', 'monthly');
  add('/faq', '0.5', 'monthly');
  add('/shipping', '0.5', 'monthly');
  add('/returns', '0.5', 'monthly');

  // 商品与文章详情
  safeReadData('products.json', 'products').forEach(p => add(`/product/${p.id}`, '0.7', 'weekly'));
  safeReadData('articles.json', 'articles').forEach(a => add(`/article/${a.id}`, '0.6', 'monthly'));

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(u => [
      '  <url>',
      `    <loc>${u.loc.replace(/&/g, '&amp;')}</loc>`,
      `    <lastmod>${u.lastmod}</lastmod>`,
      `    <changefreq>${u.changefreq}</changefreq>`,
      `    <priority>${u.priority}</priority>`,
      '  </url>'
    ].join('\n')),
    '</urlset>',
    ''
  ].join('\n');

  res.type('application/xml').send(xml);
});

// ========== 作品说明页（竞赛答辩集中展示） ==========
app.get('/features', (req, res) => {
  res.render('features', {
    metaDescription: t(req.lang, 'feat.lead')
  });
});

// ========== 启动服务器 ==========
app.listen(PORT, () => {
  const fullCount = (quizData.full && quizData.full.questions ? quizData.full.questions.length : 0);
  const quickCount = (quizData.quick && quizData.quick.questions ? quizData.quick.questions.length : 0);
  const entrySteps = (quizData.entry && quizData.entry.steps ? quizData.entry.steps.length : 0);
  const typeCount = CONSTITUTION_TYPES.length;

  console.log(`🏮 华遗通商 平台运行在 http://localhost:${PORT}`);
  console.log(`🌐 支持多语言：${LANGS.join(' / ')}`);
  console.log(`🧭 体质测评：${typeCount} 种体质 / 完整 ${fullCount} 题 / 快速 ${quickCount} 题 / 进站引导 ${entrySteps} 步`);
  console.log(`📚 内容数据：商品 ${safeReadData('products.json', 'products').length} 件 / 文章 ${safeReadData('articles.json', 'articles').length} 篇`);
  console.log(`⚙️  环境：${NODE_ENV} | 运行期数据目录：${RUNTIME_DIR}`);
  if (!DATA_STATUS.ok) {
    console.warn(`⚠️  运行期数据目录不可写，注册与下单将只保存在内存中（重启丢失）。`);
    console.warn(`    原因：${DATA_STATUS.error}`);
  }
  console.log(`🔗 对外地址：${PUBLIC_URL || '(未设置 PUBLIC_URL，将按请求推断)'}`);
  console.log(`📦 gzip 压缩：${compression ? '已启用' : '未安装 compression，已跳过'}`);
  console.log(`🛡️  安全响应头：${helmet ? '已启用' : '未安装 helmet，已跳过'}`);
  console.log(`❤️  健康检查：/healthz`);
});

// 兜底：任何未捕获异常都记录日志而不是让进程静默退出，便于云端排查
process.on('uncaughtException', (err) => {
  console.error('❌ 未捕获异常：', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ 未处理的 Promise 拒绝：', reason);
});
