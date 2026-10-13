/**
 * SEO 描述文案（用于 meta description / og:description）
 *
 * 用法（项目根目录）：node tools/i18n/_add_seo_keys.js
 */
const fs = require('fs');
const path = require('path');

const LOCALES = path.join(__dirname, '..', '..', 'data', 'locales');

const A = {
  'site.description': {
    zh: '华遗通商——非遗好物·本草·汉服。九种中医体质测评，按体质推荐非遗养生好物；支持中英日韩四语言。',
    en: 'Huayi Tongshang — heritage crafts, Chinese herbs and hanfu. Take a nine-constitution TCM assessment and get heritage wellness goods matched to your body; available in four languages.',
    ja: '華遺通商——無形文化遺産の逸品・本草・漢服。九種の中医学体質チェックで、体質に合う養生の逸品をご提案。四言語対応。',
    ko: '화유통상 — 무형문화유산 아이템·본초·한푸. 9가지 중의학 체질 진단으로 체질에 맞는 양생 아이템을 추천하며 4개 언어를 지원합니다.'
  },
  'meta.productsDescription': {
    zh: '浏览华遗通商的全部非遗好物：本草养生、非遗手作、汉服形制，共 {n} 件精选。',
    en: 'Browse all heritage goods at Huayi Tongshang: herbal wellness, heritage handicrafts and hanfu — {n} curated items.',
    ja: '華遺通商の無形文化遺産の逸品一覧：本草養生・手仕事・漢服、全 {n} 点。',
    ko: '화유통상의 모든 무형문화유산 아이템: 본초 양생, 수공예, 한푸 총 {n}점.'
  },
  'meta.quizDescription': {
    zh: '依据《中医体质分类与判定》标准，18 道题测出你的九种体质归属，并获得非遗养生调养方案与商品推荐。',
    en: 'Based on the TCM constitution classification standard: 18 questions reveal your constitution among nine types, with heritage wellness advice and product recommendations.',
    ja: '中医体質分類の標準に基づき、18問で九種体質を判定。無形文化遺産の養生方案と商品をご提案します。',
    ko: '중의학 체질 분류 표준에 따라 18문항으로 9가지 체질을 판정하고 무형문화유산 양생 방안과 상품을 추천합니다.'
  },
  'meta.articlesDescription': {
    zh: '二十四节气养生、非遗技艺、汉服形制——读懂中华生活智慧的文化百科。',
    en: 'Seasonal wellness by the 24 solar terms, heritage crafts and hanfu — a library of Chinese living wisdom.',
    ja: '二十四節気の養生、無形文化遺産の技、漢服の形制——中華の暮らしの知恵を読む文化百科。',
    ko: '24절기 양생, 무형문화유산 기예, 한푸 형식 — 중화 생활 지혜를 읽는 문화 백과.'
  }
};

for (const lang of ['zh', 'en', 'ja', 'ko']) {
  const file = path.join(LOCALES, `${lang}.json`);
  const table = JSON.parse(fs.readFileSync(file, 'utf8'));
  let n = 0;
  for (const [k, v] of Object.entries(A)) {
    if (!(k in table)) { table[k] = v[lang]; n++; }
  }
  fs.writeFileSync(file, JSON.stringify(table, null, 2) + '\n', 'utf8');
  console.log(`${lang}.json: +${n}, total ${Object.keys(table).length}`);
}

const keys = (l) => Object.keys(JSON.parse(fs.readFileSync(path.join(LOCALES, `${l}.json`), 'utf8'))).sort();
const zh = keys('zh');
for (const l of ['en', 'ja', 'ko']) {
  const k = keys(l);
  console.log(`${l}: missing ${zh.filter((x) => !k.includes(x)).length}, extra ${k.filter((x) => !zh.includes(x)).length}`);
}
