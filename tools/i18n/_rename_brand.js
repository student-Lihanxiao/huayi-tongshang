/**
 * 品牌改名：东方·集成  ->  华遗通商
 *
 * - data/locales/*.json 中的品牌文案（含关于页的品牌释义）
 * - 保留邮箱域名等无关内容不变
 *
 * 用法（项目根目录）：node tools/i18n/_rename_brand.js
 */
const fs = require('fs');
const path = require('path');

const LOCALES = path.join(__dirname, '..', '..', 'data', 'locales');
const OLD = '东方·集成';
const NEW = '华遗通商';
const OLD_TRAD = '東方·集成';

// 各语言下的品牌名（英文/日文/韩文保留中文商号并附译名，符合老字号做法）
const BRAND = {
  zh: '华遗通商',
  en: '华遗通商 · Huayi Tongshang',
  ja: '華遺通商',
  ko: '화유통상'
};

// 品牌释义：契合「非遗好物流通」的商号定位
const ABOUT = {
  zh: {
    'about.heading': '华遗通商 · 器物有道',
    'about.p1': '华遗通商创立于 2024 年，源自对中华非物质文化遗产的深深敬意。我们相信，每一味本草、每一件手作、每一套汉服，都承载着民族千年的技艺记忆。',
    'about.p2': '商号「华遗通商」取意「华遗之粹，通商天下」——做非遗好物的流通者，让散落民间的手艺被更多人用到、看见。我们以现代电商平台连接传承人与使用者，让非遗走进日常。'
  },
  en: {
    'about.heading': 'Huayi Tongshang · Where Craft Meets Daily Life',
    'about.p1': 'Huayi Tongshang was founded in 2024, born of deep respect for China\u2019s intangible cultural heritage. We believe every herb, every handmade piece and every hanfu garment carries a thousand years of craft memory.',
    'about.p2': 'The name \u201cHuayi Tongshang\u201d means \u201cthe essence of Chinese heritage, traded to the world\u201d \u2014 we are the channel for heritage goods, so that crafts once scattered across China\u2019s communities are used and seen by more people. We connect inheritors with users through a modern platform, bringing heritage into everyday life.'
  },
  ja: {
    'about.heading': '華遺通商 · 器に道あり',
    'about.p1': '華遺通商は2024年、中国の無形文化遺産への深い敬意から生まれました。一株の本草、一点の手仕事、一揃いの漢服 —— その一つひとつに、千年の技の記憶が宿っていると私たちは信じています。',
    'about.p2': '商号「華遺通商」は「中華の遺産の精髄を、世界へ商う」という願いを込めています。民間に散らばる手仕事の品を、より多くの人に使っていただき、目にしていただくための流通の担い手でありたい。現代のECプラットフォームで継承者と使い手をつなぎ、無形文化遺産を日常へお届けします。'
  },
  ko: {
    'about.heading': '화유통상 · 기물에 길이 있다',
    'about.p1': '화유통상은 중국 무형문화유산에 대한 깊은 존경에서 2024년에 설립되었습니다. 한 약재, 하나의 수공예품, 한 벌의 한푸에 천 년의 기예 기억이 담겨 있다고 믿습니다.',
    'about.p2': '상호 \u201c화유통상\u201d은 \u201c중화 유산의 정수를 세상에 유통한다\u201d는 뜻입니다. 민간에 흩어진 수공예품을 더 많은 사람이 쓰고 볼 수 있게 하는 유통의 길잡이가 되고자 합니다. 현대 전자상거래 플랫폼으로 전승자와 사용자를 연결해 무형문화유산을 일상으로 들여놓습니다.'
  }
};

// 简介/口号也改成「非遗流通」定位
const EXTRA = {
  zh: {
    'site.tagline': '让非遗好物走进日常',
    'site.subtitle': '本草 · 非遗 · 汉服 · 手作通商',
    'site.slogan': '华遗之粹，通商天下。让非遗走进日常，让手艺被看见。',
    'site.copyright': '© 2026 华遗通商 · 华遗之粹 通商天下',
    'contact.addressText': '浙江省杭州市西湖区龙井路 1 号 华遗通商文化馆',
    'join.intro': '如果你热爱中华非遗文化，认同我们的理念，欢迎加入华遗通商大家庭！',
    'quiz.entryPopupTitle': '欢迎来到华遗通商'
  },
  en: {
    'site.tagline': 'Bringing heritage craft into everyday life',
    'site.subtitle': 'Herbs · Heritage Craft · Hanfu · Trading in Handmade Goods',
    'site.slogan': 'The essence of Chinese heritage, traded to the world. Bringing craft into daily life, so it is seen and used.',
    'site.copyright': '© 2026 Huayi Tongshang · Heritage Essence, Traded to the World',
    'contact.addressText': 'Huayi Tongshang Culture Hall, No. 1 Longjing Road, Xihu District, Hangzhou, Zhejiang',
    'join.intro': 'If you love China\u2019s intangible cultural heritage and share our vision, we would love you to join the Huayi Tongshang family.',
    'quiz.entryPopupTitle': 'Welcome to Huayi Tongshang'
  },
  ja: {
    'site.tagline': '無形文化遺産の逸品を、日常へ',
    'site.subtitle': '本草 · 無形文化遺産 · 漢服 · 手仕事の商い',
    'site.slogan': '中華の遺産の精髄を、世界へ商う。無形文化遺産を日常へ、技を人の目に。',
    'site.copyright': '© 2026 華遺通商 · 中華の遺産の精髄を世界へ',
    'contact.addressText': '浙江省杭州市西湖区龍井路1号 華遺通商文化館',
    'join.intro': '中国の無形文化遺産を愛し、私たちの理念に共感してくださる方、華遺通商の仲間になりませんか。',
    'quiz.entryPopupTitle': '華遺通商へようこそ'
  },
  ko: {
    'site.tagline': '무형문화유산의 좋은 물건을 일상으로',
    'site.subtitle': '본초 · 무형문화유산 · 한푸 · 수공예 유통',
    'site.slogan': '중화 유산의 정수를 세상에 유통합니다. 무형문화유산을 일상으로, 기예를 사람들의 눈앞으로.',
    'site.copyright': '© 2026 화유통상 · 중화 유산의 정수를 세상에',
    'contact.addressText': '저장성 항저우시 시후구 룽징로 1호 화유통상 문화관',
    'join.intro': '중국의 무형문화유산을 사랑하고 우리의 이념에 공감하신다면 화유통상 가족이 되어 주세요.',
    'quiz.entryPopupTitle': '화유통상에 오신 것을 환영합니다'
  }
};

const log = [];

for (const lang of ['zh', 'en', 'ja', 'ko']) {
  const file = path.join(LOCALES, `${lang}.json`);
  const table = JSON.parse(fs.readFileSync(file, 'utf8'));
  let replaced = 0;

  // 1) 品牌名统一
  table['site.name'] = BRAND[lang];

  // 2) 全局替换旧品牌（zh 与 ja/ko 里出现的简体商号）
  for (const [k, v] of Object.entries(table)) {
    if (typeof v !== 'string') continue;
    if (v.includes(OLD) || v.includes(OLD_TRAD)) {
      table[k] = v.split(OLD).join(BRAND[lang]).split(OLD_TRAD).join(BRAND[lang]);
      replaced++;
    }
  }

  // 3) 关于页与新定位文案
  Object.assign(table, ABOUT[lang], EXTRA[lang]);

  fs.writeFileSync(file, JSON.stringify(table, null, 2) + '\n', 'utf8');
  log.push(`${lang}.json: site.name="${BRAND[lang]}", ${replaced} 处旧品牌替换, 关于页文案已重写`);
}

console.log(log.join('\n'));

// ---------------------------------------------------------------- 自检
console.log('\n=== 残留旧品牌检查 ===');
let leftovers = 0;
for (const lang of ['zh', 'en', 'ja', 'ko']) {
  const table = JSON.parse(fs.readFileSync(path.join(LOCALES, `${lang}.json`), 'utf8'));
  for (const [k, v] of Object.entries(table)) {
    if (typeof v === 'string' && (v.includes(OLD) || v.includes(OLD_TRAD) || v.includes('Dongfang Jicheng'))) {
      console.log(`  ${lang}.json ${k}: ${v.slice(0, 90)}`);
      leftovers++;
    }
  }
}
console.log(leftovers === 0 ? '  无残留 ✓' : `  ${leftovers} 处残留`);

console.log('\n=== 四语言关键品牌字段 ===');
for (const lang of ['zh', 'en', 'ja', 'ko']) {
  const t = JSON.parse(fs.readFileSync(path.join(LOCALES, `${lang}.json`), 'utf8'));
  console.log(`[${lang}] name=${t['site.name']} | tagline=${t['site.tagline']}`);
}

// 键集合一致性
const keys = (l) => Object.keys(JSON.parse(fs.readFileSync(path.join(LOCALES, `${l}.json`), 'utf8'))).sort();
const zh = keys('zh');
console.log('\n=== 键集合一致性 ===');
for (const l of ['en', 'ja', 'ko']) {
  const k = keys(l);
  console.log(`${l}: missing ${zh.filter((x) => !k.includes(x)).length}, extra ${k.filter((x) => !zh.includes(x)).length}, total ${k.length}`);
}
