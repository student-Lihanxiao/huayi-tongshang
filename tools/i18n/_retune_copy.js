/**
 * 品牌文案微调：让首页/关于/加入页的口径与新商号「华遗通商」一致
 * （主题仍是非遗养生，只是把「东方」换成「中华非遗」的表达）
 *
 * 用法（项目根目录）：node tools/i18n/_retune_copy.js
 */
const fs = require('fs');
const path = require('path');

const LOCALES = path.join(__dirname, '..', '..', 'data', 'locales');

const PATCH = {
  zh: {
    'home.heroTitle': '让世界看见中华非遗之美',
    'articles.lead': '节气养生、非遗技艺、汉服形制 —— 读懂中华生活智慧。',
    'about.t3Text': '建立「中华非遗养生文化库」，收录节气养生、非遗技艺等科普内容。',
    'about.t4Text': '全新平台上线，支持中英日韩多语言与体质测评，让非遗好物走向世界。',
    'join.lead': '让非遗好物走进更多人的生活，需要更多同行者。',
    'shipping.introText': '我们支持全球配送！无论您身在何处，都能收到来自中华非遗的好物。',
    'quiz.homeEntryTitle': '不知道从哪里开始？先测体质',
    'quiz.homeEntryLead': '回答几个问题，我们按你的体质从非遗好物中挑出最合适的一套。',
    'quiz.recommendLead': '按你的体质匹配度排序，全部来自平台非遗养生线。',
    'quiz.lifestyleLead': '非遗器物与汉服形制同样讲气质相合 —— 按你的体质气质挑选。'
  },
  en: {
    'home.heroTitle': 'Let the world see the beauty of Chinese heritage',
    'articles.lead': 'Seasonal wellness, heritage crafts and hanfu forms — read the wisdom of Chinese living.',
    'about.t3Text': 'Built the Chinese Heritage Wellness Library, collecting solar-term wellness and heritage craft knowledge.',
    'about.t4Text': 'A brand-new platform with four languages and a constitution assessment, bringing heritage goods to the world.',
    'join.lead': 'Bringing heritage goods into more people\u2019s lives takes more hands.',
    'shipping.introText': 'We ship worldwide — wherever you are, authentic Chinese heritage goods can reach you.',
    'quiz.homeEntryLead': 'Answer a few questions and we will pick the most suitable set of heritage goods for your constitution.'
  },
  ja: {
    'home.heroTitle': '中華の無形文化遺産の美を、世界へ',
    'articles.lead': '二十四節気の養生、無形文化遺産の技、漢服の形制 —— 中華の暮らしの知恵を読む。',
    'about.t3Text': '「中華無形文化遺産・養生文化ライブラリ」を構築し、節気の養生や無形文化遺産の技などの記事を収録。',
    'about.t4Text': '新プラットフォームを公開。中国語・英語・日本語・韓国語と体質チェックに対応し、無形文化遺産の逸品を世界へ。',
    'join.lead': '無形文化遺産の逸品をより多くの暮らしへ届けるには、ともに歩む仲間が必要です。',
    'shipping.introText': '世界配送に対応しています。どこにいても、中華の無形文化遺産の逸品をお届けします。',
    'quiz.homeEntryLead': 'いくつかの質問にお答えいただくと、あなたの体質に合う無形文化遺産の逸品をお選びします。'
  },
  ko: {
    'home.heroTitle': '중화 무형문화유산의 아름다움을 세상에',
    'articles.lead': '절기 양생, 무형문화유산 기예, 한푸 형식 — 중화 생활의 지혜를 읽습니다.',
    'about.t3Text': '「중화 무형문화유산 양생 문화 자료관」을 세워 절기 양생과 무형문화유산 기예 등의 콘텐츠를 수록했습니다.',
    'about.t4Text': '새 플랫폼을 열었습니다. 중·영·일·한 4개 언어와 체질 진단을 지원하며 무형문화유산의 좋은 물건을 세계로 보냅니다.',
    'join.lead': '무형문화유산의 좋은 물건을 더 많은 삶에 전하려면 함께할 동료가 필요합니다.',
    'shipping.introText': '전 세계로 배송합니다. 어디에 계시든 중화 무형문화유산의 좋은 물건을 받아보실 수 있습니다.',
    'quiz.homeEntryLead': '몇 가지 질문에 답하시면 체질에 가장 잘 맞는 무형문화유산 아이템을 골라 드립니다.'
  }
};

for (const lang of ['zh', 'en', 'ja', 'ko']) {
  const file = path.join(LOCALES, `${lang}.json`);
  const table = JSON.parse(fs.readFileSync(file, 'utf8'));
  let n = 0;
  for (const [k, v] of Object.entries(PATCH[lang])) {
    if (k in table) { table[k] = v; n++; }
  }
  fs.writeFileSync(file, JSON.stringify(table, null, 2) + '\n', 'utf8');
  console.log(`${lang}.json: 更新 ${n} 条文案`);
}

// 自检：仍然以「东方」打头的品牌式表达
console.log('\n=== 剩余含「东方」的文案（应仅为「养生东方」类描述性表达或已改写） ===');
for (const lang of ['zh']) {
  const t = JSON.parse(fs.readFileSync(path.join(LOCALES, `${lang}.json`), 'utf8'));
  for (const [k, v] of Object.entries(t)) {
    if (typeof v === 'string' && v.includes('东方')) console.log(`  ${k}: ${v.slice(0, 90)}`);
  }
}
console.log('\n=== 键集合一致性 ===');
const keys = (l) => Object.keys(JSON.parse(fs.readFileSync(path.join(LOCALES, `${l}.json`), 'utf8'))).sort();
const zh = keys('zh');
for (const l of ['en', 'ja', 'ko']) {
  const k = keys(l);
  console.log(`${l}: missing ${zh.filter((x) => !k.includes(x)).length}, extra ${k.filter((x) => !zh.includes(x)).length}`);
}
