/**
 * 首页「非遗四德」区块 + 关于页价值文案的多语言键
 *
 * 用法（项目根目录）：node tools/i18n/_add_values_keys.js
 */
const fs = require('fs');
const path = require('path');

const LOCALES = path.join(__dirname, '..', '..', 'data', 'locales');

const A = {
  'home.valuesTitle': {
    zh: '我们如何对待每一件非遗',
    en: 'How we treat every heritage piece',
    ja: '無形文化遺産の一点ずつに、どう向き合うか',
    ko: '무형문화유산 한 점을 대하는 방식'
  },
  'home.value1Title': { zh: '溯源', en: 'Traceable', ja: '溯源', ko: '근원 추적' },
  'home.value1Text': {
    zh: '每一件手作都可追溯到传承人与产地，拒绝来路不明的「非遗」标签。',
    en: 'Every handmade piece traces back to its inheritor and origin — no vague “heritage” labels.',
    ja: '一点ずつが継承者と産地まで辿れる。出所の不明な「無形文化遺産」表示はしません。',
    ko: '모든 수공예품은 전승자와 산지까지 추적 가능하며, 출처가 불분명한 「무형문화유산」 표기는 하지 않습니다.'
  },
  'home.value2Title': { zh: '手作', en: 'Handmade', ja: '手仕事', ko: '수공예' },
  'home.value2Text': {
    zh: '坚持古法工序，九蒸九晒、手工捆扎、手工刻绘，不为效率牺牲手艺。',
    en: 'Traditional processes kept intact — nine steaming and sunning, hand-tying, hand-carving. Craft is never traded for speed.',
    ja: '古法の工程を守り、九蒸九晒・手結び・手彫り。効率のために技を犠牲にしません。',
    ko: '구증구쇄, 손 묶음, 손 조각 등 전통 공정을 지키며 효율을 위해 기예를 타협하지 않습니다.'
  },
  'home.value3Title': { zh: '本草', en: 'Herbal', ja: '本草', ko: '본초' },
  'home.value3Text': {
    zh: '本草按节气采收、按体质配伍，先懂体质再选好物。',
    en: 'Herbs are harvested by solar term and matched to your constitution — know your body before you choose.',
    ja: '本草は節気に合わせて採取し、体質に合わせて組み合わせる。まず体質を知り、それから選ぶ。',
    ko: '본초는 절기에 맞춰 채취하고 체질에 맞춰 배합합니다. 먼저 체질을 알고 나서 고릅니다.'
  },
  'home.value4Title': { zh: '日用', en: 'Everyday', ja: '日常', ko: '일상' },
  'home.value4Text': {
    zh: '非遗不该只在博物馆里。能泡、能用、能穿的，才是活着的传承。',
    en: 'Heritage should not live only in museums. What you can brew, use and wear is heritage that stays alive.',
    ja: '無形文化遺産は博物館の中だけにあるべきではない。淹れられ、使え、着られるものこそ、生きている継承です。',
    ko: '무형문화유산은 박물관 안에만 있어서는 안 됩니다. 우려 마시고, 쓰고, 입을 수 있는 것이 살아 있는 전승입니다.'
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

// 键集合一致性自检
const keys = (l) => Object.keys(JSON.parse(fs.readFileSync(path.join(LOCALES, `${l}.json`), 'utf8'))).sort();
const zh = keys('zh');
for (const l of ['en', 'ja', 'ko']) {
  const k = keys(l);
  const missing = zh.filter((x) => !k.includes(x));
  const extra = k.filter((x) => !zh.includes(x));
  console.log(`${l}: missing ${missing.length}${missing.length ? ' -> ' + missing.join(',') : ''}, extra ${extra.length}`);
}
