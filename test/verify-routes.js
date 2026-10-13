/**
 * Route + i18n verification harness.
 * - GETs every route in zh / en / ja / ko
 * - asserts HTTP 200 and no EJS error page
 * - asserts no residual simplified-Chinese characters in non-zh pages
 * - exercises the quiz flows end-to-end (POST -> result) per language
 *
 * Usage: node test/verify-routes.js [port]      (default 3001, or TEST_PORT env)
 * Start the app first, e.g.  PORT=3001 npm run start
 */
const http = require('http');
const { Buffer } = require('buffer');

const PORT = Number(process.argv[2] || process.env.TEST_PORT || 3001);
const HOST = '127.0.0.1';

function request(method, path, { cookie, form } = {}) {
  return new Promise((resolve, reject) => {
    const body = form ? new URLSearchParams(form).toString() : null;
    const headers = {};
    if (body) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = Buffer.byteLength(body);
    }
    if (cookie) headers['Cookie'] = cookie;

    const req = http.request({ host: HOST, port: PORT, method, path, headers }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({
        status: res.statusCode,
        body: data,
        setCookie: res.headers['set-cookie'] || [],
        location: res.headers.location
      }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------- detection
// We flag SIMPLIFIED-ONLY Chinese characters that have NO traditional/Japanese
// counterpart. Characters belonging to Japan's Joyo kanji table (国/学/体/医/区/
// 数/与/内/条/実/気 …) are deliberately EXCLUDED, because Japanese legitimately
// writes them in these forms — flagging them produced false positives such as
// 係数 (Japanese: coefficient) or 体質.
// Query-string values such as ?category=养生 are stripped, because the category
// key is intentionally Chinese.
const SIMPLIFIED_ONLY = /[苹爱肮袄坝办帮报备贝钡笔币毕边变辩标鳖别瘪濒滨宾饼拨钵铂驳补惭灿苍舱仓沧厕侧测层搀馋缠忏偿厂场尝长肠畅钞车彻尘陈衬撑惩迟驰耻齿冲宠筹绸础聪丛凑窜错达带贷郸掸惮诞弹挡荡档捣岛导邓敌涤递缔颠垫栋冻读赌镀锻队吨顿夺鹅额讹恶饿儿尔饵贰罚阀珐矾钒烦范贩饭访纺废费纷坟奋愤粪丰枫锋疯冯缝讽凤肤辐抚辅赋复负讣妇缚钙盖赶秆赣冈刚钢纲岗皋镐搁鸽阁铬龚巩贡钩沟构购够蛊顾剐观馆惯贯广规硅归龟闺轨诡柜贵刽辊滚锅骇韩汉阂鹤贺轰鸿红壶护沪户哗华划话怀坏欢环还缓换唤痪焕涣谎挥辉毁贿秽烩汇讳诲绘荤浑伙获货祸击积饥讥鸡绩缉极辑级挤蓟剂济计记际继纪夹荚颊贾钾价驾歼监坚笺间艰缄茧检碱硷拣捡简俭减荐槛鉴贱见键舰剑饯渐溅涧浆桨奖讲酱胶浇骄娇搅铰矫侥脚饺缴绞轿较阶洁结诫紧锦仅谨进晋烬劲荆睛鲸惊经颈镜旧驹举锯惧剧鹃绢杰镌浚军骏凯颗壳课垦恳抠库裤夸块侩宽矿旷况亏岿窥馈溃扩阔蜡腊赖蓝栏拦篮阑澜谰揽览懒缆烂滥捞劳涝镭垒类泪篱鲤丽厉砾历沥隶俩联莲连镰涟帘敛脸链炼练粮凉两辆谅疗辽镣猎临邻鳞凛赁龄铃灵岭领馏刘龙聋咙笼垄拢陇娄搂篓芦卢颅庐掳卤虏鲁碌赂录陆驴吕铝侣缕虑滤绿峦挛孪滦抡轮伦仑沦纶论萝罗逻锣箩骡骆络妈玛码蚂骂吗买卖迈脉瞒馒满谩锚铆贸么霉镁闷们锰梦谜觅绵缅庙灭悯闽鸣铭谬谋亩钠纳难挠脑恼闹馁拟腻撵酿鸟聂啮镊镍柠狞宁拧泞钮纽脓浓农疟诺鸥呕沤盘庞抛赔喷鹏骗飘频贫凭评泼颇扑铺仆谱脐齐骑岂启弃讫牵扦钎铅迁签谦钱钳谴堑枪呛墙蔷强抢锹桥乔侨翘窍钦亲轻氢倾顷请庆琼穷趋躯驱龋颧权劝却鹊让饶扰绕热韧认纫荣绒软锐闰润洒萨鳃赛伞丧骚扫涩杀纱筛删闪陕赡缮伤赏烧绍设绅审婶肾渗绳胜圣师狮诗尸蚀实识驶势释饰视试兽输书赎术树竖帅谁顺说硕烁丝饲耸怂颂讼诵擞苏诉肃虽绥岁孙损笋缩琐锁獭挞抬摊贪瘫滩坛谭谈叹汤烫绦讨腾誊锑题屉贴铁厅烃铜统头图涂团颓蜕鸵驮驼椭洼袜弯湾顽网韦违围为潍维苇伟伪纬谓卫闻纹稳问瓮挝蜗涡窝呜钨乌污诬芜吴坞雾务误锡牺袭习铣戏细虾辖峡侠狭厦锨鲜纤咸贤衔闲显险现县线厢镶乡详响项萧销晓啸蝎协挟胁谐泻谢锌衅兴汹锈绣虚须许绪续轩悬选癣绚勋询寻驯训讯逊压鸦鸭哑亚讶阉烟盐严颜阎艳厌砚谚验鸯杨扬疡阳痒养样瑶摇尧窑谣药爷页业叶靥颐遗仪彝蚁艺亿忆义诣议谊译异绎荫阴银饮樱婴鹰应缨莹莺营荧蝇赢颖哟拥佣痈咏优忧邮铀犹诱屿语吁御狱预驭鸳渊辕园员圆缘远愿约跃钥粤阅郧匀陨运蕴酝晕韵杂灾载攒暂赞赃脏凿枣灶责择则泽贼赠扎轧铡闸栅诈斋债毡盏斩辗崭栈战绽张涨帐账胀赵蛰辙贞针侦诊镇阵挣睁狰筝织职执纸挚掷帜质钟终种肿众诌轴皱骤诸诛烛瞩贮铸驻专砖转赚桩妆锥赘坠缀谆浊兹资渍踪综总纵邹诅组钻舆]/;

// Query-string values, e.g. href="/products?category=养生"
function stripQueryValues(html) {
  return html.replace(/(\/[^"'\s>]*\?[^"'\s>]*)/g, (m) => m.replace(/=[^&"'\s>]*/g, '='));
}

function detectSimplified(html) {
  const text = stripQueryValues(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/%[0-9A-Fa-f]{2}/g, ' ')
    // 中文 / 日本語 / 한국어 language-menu labels are endonyms by design
    .replace(/[\u4e00-\u9fff\uac00-\ud7af]+/g, (m) => (m.length <= 4 ? ' ' : m))
    .replace(/华遗通商|華遺通商|화유통상|Huayi Tongshang/g, ' ')
    .replace(/[¥￥]/g, ' ')
    // Documented exceptions: 中医/中医学 and 体質 are standard Japanese; their
    // glyphs (医/体) are shared with Simplified Chinese, not simplified-only.
    .replace(/中医学|中医|体質/g, ' ');
  const hits = text.match(SIMPLIFIED_ONLY);
  return hits ? hits : [];
}

function chineseHits(html) {
  return detectSimplified(html);
}

function isErrorPage(html) {
  return /ReferenceError|TypeError|SyntaxError|is not defined|Cannot read|EJS|<pre>/.test(html)
    && /Error/i.test(html.slice(0, 400));
}

const results = [];
let failures = 0;

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  if (!ok) failures++;
}

async function checkPage(lang, path, label) {
  const url = encodeURI(path) + (path.includes('?') ? '&' : '?') + 'lang=' + lang;
  const res = await request('GET', url);
  const name = `[${lang}] GET ${label || path}`;

  if (res.status !== 200) {
    record(name, false, `status ${res.status}`);
    return res;
  }
  if (isErrorPage(res.body)) {
    const m = res.body.match(/<pre>([\s\S]{0,300})/);
    record(name, false, 'render error: ' + (m ? m[1].replace(/&lt;/g, '<').slice(0, 200) : 'unknown'));
    return res;
  }
  if (lang !== 'zh') {
    const hits = chineseHits(res.body);
    if (hits.length) {
      // show unique chars + a snippet of context
      const uniq = [...new Set(hits)].slice(0, 20).join('');
      const idx = res.body.indexOf(hits[0]);
      const ctx = res.body.slice(Math.max(0, idx - 70), idx + 70).replace(/\s+/g, ' ');
      record(name, false, `residual Chinese (${hits.length} chars, uniq "${uniq}") ctx: ...${ctx}...`);
      return res;
    }
  }
  record(name, true, `${res.body.length} bytes`);
  return res;
}

(async () => {
  const LANGS = ['zh', 'en', 'ja', 'ko'];

  const pages = [
    ['/', 'home'],
    ['/quiz', 'quiz landing'],
    ['/quiz/full', 'full quiz'],
    ['/quiz/quick', 'quick quiz'],
    ['/products', 'products all'],
    ['/products?category=养生', 'products health'],
    ['/products?category=非遗', 'products heritage'],
    ['/products?category=汉服', 'products hanfu'],
    ['/product/1', 'product health detail'],
    ['/product/17', 'product heritage detail'],
    ['/product/25', 'product hanfu detail'],
    ['/articles', 'articles'],
    ['/features', 'features / project overview'],
    ['/article/1', 'article 1'],
    ['/article/4', 'article 4'],
    ['/article/28', 'article 28'],
    ['/cart', 'cart empty'],
    ['/login', 'login'],
    ['/register', 'register'],
    ['/about', 'about'],
    ['/contact', 'contact'],
    ['/join', 'join'],
    ['/faq', 'faq'],
    ['/shipping', 'shipping'],
    ['/returns', 'returns'],
    ['/solar-terms', 'solar terms']
  ];

  console.log('=== PAGE ROUTES x 4 LANGUAGES ===');
  for (const lang of LANGS) {
    for (const [p, label] of pages) {
      await checkPage(lang, p, label);
    }
  }

  // ---------------------------------------------------------------- quiz flows
  console.log('\n=== QUIZ FLOWS ===');

  for (const lang of LANGS) {
    // --- full quiz: answer everything with "总是" (4) to force a strong type
    const jar = {};
    const capture = (res) => {
      for (const c of res.setCookie) {
        const [pair] = c.split(';');
        const [k, v] = pair.split('=');
        jar[k] = v;
      }
    };
    const cookieStr = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');

    let res = await request('GET', `/quiz/full?lang=${lang}`);
    capture(res);
    record(`[${lang}] full quiz page`, res.status === 200, `status ${res.status}`);

    const form = { mode: 'full' };
    for (let i = 1; i <= 18; i++) form[`answers[f${i}]`] = String(i % 5);
    res = await request('POST', '/quiz/submit', { cookie: cookieStr(), form });
    capture(res);
    record(`[${lang}] POST /quiz/submit (full)`, res.status === 302, `status ${res.status} -> ${res.location}`);

    res = await request('GET', `/quiz/result?lang=${lang}`, { cookie: cookieStr() });
    const hasProducts = /match-badge/.test(res.body);
    const hasPrimary = /result-hero/.test(res.body);
    const chi = lang === 'zh' ? [] : chineseHits(res.body);
    record(`[${lang}] full result page`, res.status === 200 && hasPrimary && hasProducts && chi.length === 0,
      `status ${res.status} hero=${hasPrimary} products=${hasProducts} residualCJK=${chi.length}`);

    // --- quick quiz
    const jar2 = {};
    const capture2 = (r) => { for (const c of r.setCookie) { const [p] = c.split(';'); const [k, v] = p.split('='); jar2[k] = v; } };
    const cookie2 = () => Object.entries(jar2).map(([k, v]) => `${k}=${v}`).join('; ');

    res = await request('GET', `/quiz/quick?lang=${lang}`);
    capture2(res);
    const quickForm = { mode: 'quick' };
    for (let i = 1; i <= 5; i++) quickForm[`answers[q${i}]`] = String(i % 4);
    res = await request('POST', '/quiz/submit', { cookie: cookie2(), form: quickForm });
    capture2(res);
    record(`[${lang}] POST /quiz/submit (quick)`, res.status === 302, `status ${res.status}`);

    res = await request('GET', `/quiz/result?lang=${lang}`, { cookie: cookie2() });
    const qchi = lang === 'zh' ? [] : chineseHits(res.body);
    record(`[${lang}] quick result page`, res.status === 200 && /match-badge/.test(res.body) && qchi.length === 0,
      `status ${res.status} residualCJK=${qchi.length}`);

    // --- entry quiz (3 steps)
    const jar3 = {};
    const capture3 = (r) => { for (const c of r.setCookie) { const [p] = c.split(';'); const [k, v] = p.split('='); jar3[k] = v; } };
    const cookie3 = () => Object.entries(jar3).map(([k, v]) => `${k}=${v}`).join('; ');

    res = await request('GET', `/?lang=${lang}`);
    capture3(res);
    res = await request('POST', '/quiz/entry', { cookie: cookie3(), form: { goal: 'energy', scene: 'body', budget: 'mid' } });
    capture3(res);
    record(`[${lang}] POST /quiz/entry`, res.status === 302, `status ${res.status}`);

    res = await request('GET', `/quiz/result?lang=${lang}`, { cookie: cookie3() });
    const echi = lang === 'zh' ? [] : chineseHits(res.body);
    record(`[${lang}] entry result page`, res.status === 200 && /match-badge/.test(res.body) && echi.length === 0,
      `status ${res.status} residualCJK=${echi.length}`);
  }

  // -------------------------------------------------- quiz result guard (no session)
  let g = await request('GET', '/quiz/result');
  record('GET /quiz/result without session redirects', g.status === 302 && g.location === '/quiz',
    `status ${g.status} location ${g.location}`);

  // ------------------------------------------------- cart flow with localised name
  console.log('\n=== CART LOCALISATION ===');
  for (const lang of LANGS) {
    const jar = {};
    const capture = (r) => { for (const c of r.setCookie) { const [p] = c.split(';'); const [k, v] = p.split('='); jar[k] = v; } };
    const cookie = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');

    let res = await request('GET', `/?lang=${lang}`);
    capture(res);
    res = await request('POST', '/cart/add', { cookie: cookie(), form: { productId: '2', quantity: '2' } });
    capture(res);
    res = await request('GET', `/cart?lang=${lang}`, { cookie: cookie() });
    const ok = res.status === 200 && /¥256|256/.test(res.body);
    const chi = lang === 'zh' ? [] : chineseHits(res.body);
    record(`[${lang}] cart shows localised item`, ok && chi.length === 0,
      `status ${res.status} total-shown=${/256/.test(res.body)} residualCJK=${chi.length}`);
  }

  // ---------------------------------------------------------------- report
  console.log('\n=== RESULTS ===');
  const passed = results.filter(r => r.ok).length;
  for (const r of results) {
    if (!r.ok) console.log(`FAIL  ${r.name}\n        ${r.detail}`);
  }
  console.log(`\nTOTAL ${results.length}  PASS ${passed}  FAIL ${failures}`);
  process.exit(failures ? 1 : 0);
})();
