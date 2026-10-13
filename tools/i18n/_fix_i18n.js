/**
 * i18n fix + solar-term locale augmentation.
 * Fixes the defects found by the adversarial verifier and appends the
 * 24 solar-term strings needed by the localized homepage.
 */
const fs = require('fs');
const path = require('path');

const DIR = './data/locales';
const read = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
const write = (f, o) => fs.writeFileSync(path.join(DIR, f), JSON.stringify(o, null, 2) + '\n', 'utf8');

const log = [];

// ---------------------------------------------------------------- solar terms
// key order mirrors server.js termMap: 立春 雨水 惊蛰 春分 清明 谷雨 立夏 小满
// 芒种 夏至 小暑 大暑 立秋 处暑 白露 秋分 寒露 霜降 立冬 小雪 大雪 冬至 小寒 大寒
const solar = {
  zh: [
    ['lichun', '立春', '宜疏肝理气，多吃芽菜、春饼'],
    ['yushui', '雨水', '宜健脾祛湿，多吃山药、薏米'],
    ['jingzhe', '惊蛰', '宜养肝护肝，多吃菠菜、荠菜'],
    ['chunfen', '春分', '宜阴阳平衡，多吃时令蔬菜'],
    ['qingming', '清明', '宜清补养肝，多吃荠菜、青团'],
    ['guyu', '谷雨', '宜健脾祛湿，多吃薏米、赤小豆'],
    ['lixia', '立夏', '宜养心安神，多吃莲子、百合'],
    ['xiaoman', '小满', '宜清热利湿，多吃苦菜、冬瓜'],
    ['mangzhong', '芒种', '宜清热解暑，多吃绿豆、西瓜'],
    ['xiazhi', '夏至', '宜养心阴，多吃鸭肉、冬瓜'],
    ['xiaoshu', '小暑', '宜清热解暑，多吃藕、绿豆'],
    ['dashu', '大暑', '宜清热祛湿，多吃冬瓜、薏米'],
    ['liqiu', '立秋', '宜润肺养阴，多吃梨、银耳'],
    ['chushu', '处暑', '宜润肺养胃，多吃芝麻、蜂蜜'],
    ['bailu', '白露', '宜润肺防燥，多吃百合、杏仁'],
    ['qiufen', '秋分', '宜阴阳平衡，多吃山药、枸杞'],
    ['hanlu', '寒露', '宜养阴防燥，多吃芝麻、糯米'],
    ['shuangjiang', '霜降', '宜平补润肺，多吃柿子、栗子'],
    ['lidong', '立冬', '宜温补肾阳，多吃羊肉、核桃'],
    ['xiaoxue', '小雪', '宜温补抗寒，多吃牛肉、红枣'],
    ['daxue', '大雪', '宜温补助阳，多吃羊肉、桂圆'],
    ['dongzhi', '冬至', '宜温补阳气，多吃饺子、羊肉'],
    ['xiaohan', '小寒', '宜温补防寒，多吃羊肉、生姜'],
    ['dahan', '大寒', '宜温补养肾，多吃黑豆、黑芝麻']
  ],
  en: [
    ['lichun', 'Start of Spring', 'Soothe the liver and move qi — enjoy sprouts and spring pancakes'],
    ['yushui', 'Rain Water', 'Strengthen the spleen and clear dampness — Chinese yam and job\u2019s tears'],
    ['jingzhe', 'Awakening of Insects', 'Nourish and protect the liver — spinach and shepherd\u2019s purse'],
    ['chunfen', 'Spring Equinox', 'Balance yin and yang — eat seasonal vegetables'],
    ['qingming', 'Pure Brightness', 'Light tonics for the liver — shepherd\u2019s purse and green rice balls'],
    ['guyu', 'Grain Rain', 'Strengthen the spleen and clear dampness — job\u2019s tears and adzuki bean'],
    ['lixia', 'Start of Summer', 'Nourish the heart and calm the spirit — lotus seed and lily bulb'],
    ['xiaoman', 'Grain Buds', 'Clear heat and drain dampness — bitter greens and winter melon'],
    ['mangzhong', 'Grain in Ear', 'Clear heat and relieve summer thirst — mung bean and watermelon'],
    ['xiazhi', 'Summer Solstice', 'Nourish heart yin — duck and winter melon'],
    ['xiaoshu', 'Minor Heat', 'Clear heat and relieve the summer — lotus root and mung bean'],
    ['dashu', 'Major Heat', 'Clear heat and dispel dampness — winter melon and job\u2019s tears'],
    ['liqiu', 'Start of Autumn', 'Moisten the lungs and nourish yin — pear and snow fungus'],
    ['chushu', 'End of Heat', 'Moisten the lungs and nourish the stomach — sesame and honey'],
    ['bailu', 'White Dew', 'Moisten the lungs against dryness — lily bulb and apricot kernel'],
    ['qiufen', 'Autumn Equinox', 'Balance yin and yang — Chinese yam and goji berry'],
    ['hanlu', 'Cold Dew', 'Nourish yin against dryness — sesame and glutinous rice'],
    ['shuangjiang', 'Frost\u2019s Descent', 'Gentle lung tonics — persimmon and chestnut'],
    ['lidong', 'Start of Winter', 'Warm and tonify kidney yang — mutton and walnut'],
    ['xiaoxue', 'Minor Snow', 'Warm tonics against cold — beef and red date'],
    ['daxue', 'Major Snow', 'Warm tonics to support yang — mutton and longan'],
    ['dongzhi', 'Winter Solstice', 'Warm and tonify yang qi — dumplings and mutton'],
    ['xiaohan', 'Minor Cold', 'Warm tonics against the cold — mutton and ginger'],
    ['dahan', 'Major Cold', 'Warm tonics for the kidney — black bean and black sesame']
  ],
  ja: [
    ['lichun', '立春', '肝を疏し気を巡らせる。もやしや春餅を'],
    ['yushui', '雨水', '脾を健やかにし湿を除く。山薬やハトムギを'],
    ['jingzhe', '啓蟄', '肝を養い守る。ほうれん草やナズナを'],
    ['chunfen', '春分', '陰陽の平衡を。旬の野菜を多く'],
    ['qingming', '清明', '清補で肝を養う。ナズナやよもぎ団子を'],
    ['guyu', '穀雨', '脾を健やかにし湿を除く。ハトムギや赤小豆を'],
    ['lixia', '立夏', '心を養い安神する。蓮子や百合を'],
    ['xiaoman', '小満', '清熱利湿。苦味野菜や冬瓜を'],
    ['mangzhong', '芒種', '清熱解暑。緑豆やスイカを'],
    ['xiazhi', '夏至', '心陰を養う。鴨肉や冬瓜を'],
    ['xiaoshu', '小暑', '清熱解暑。蓮根や緑豆を'],
    ['dashu', '大暑', '清熱除湿。冬瓜やハトムギを'],
    ['liqiu', '立秋', '肺を潤し陰を養う。梨や白きくらげを'],
    ['chushu', '処暑', '肺と胃を潤す。ごまと蜂蜜を'],
    ['bailu', '白露', '肺を潤し乾燥を防ぐ。百合や杏仁を'],
    ['qiufen', '秋分', '陰陽の平衡を。山薬やクコの実を'],
    ['hanlu', '寒露', '陰を養い乾燥を防ぐ。ごまと餅米を'],
    ['shuangjiang', '霜降', '穏やかに肺を補う。柿や栗を'],
    ['lidong', '立冬', '腎陽を温補。羊肉やくるみを'],
    ['xiaoxue', '小雪', '温補で寒さに備える。牛肉やなつめを'],
    ['daxue', '大雪', '温補で陽を助ける。羊肉や竜眼肉を'],
    ['dongzhi', '冬至', '陽気を温補。餃子や羊肉を'],
    ['xiaohan', '小寒', '温補で防寒。羊肉や生姜を'],
    ['dahan', '大寒', '温補で腎を養う。黒豆や黒ごまを']
  ],
  ko: [
    ['lichun', '입춘', '간을 소통시키고 기를 순환시키세요. 새싹채소와 춘병을'],
    ['yushui', '우수', '비위를 건강하게 하고 습을 제거하세요. 마와 율무를'],
    ['jingzhe', '경칩', '간을 기르고 보호하세요. 시금치와 냉이를'],
    ['chunfen', '춘분', '음양의 균형을 맞추세요. 제철 채소를 많이'],
    ['qingming', '청명', '맑게 보하면서 간을 기르세요. 냉이와 쑥떡을'],
    ['guyu', '곡우', '비위를 건강하게 하고 습을 제거하세요. 율무와 팥을'],
    ['lixia', '입하', '심을 기르고 마음을 안정시키세요. 연자육과 백합을'],
    ['xiaoman', '소만', '열을 내리고 습을 배출하세요. 쓴 나물과 동아를'],
    ['mangzhong', '망종', '열을 내리고 더위를 식히세요. 녹두와 수박을'],
    ['xiazhi', '하지', '심음을 기르세요. 오리고기와 동아를'],
    ['xiaoshu', '소서', '열을 내리고 더위를 식히세요. 연근과 녹두를'],
    ['dashu', '대서', '열을 내리고 습을 제거하세요. 동아와 율무를'],
    ['liqiu', '입추', '폐를 윤택하게 하고 음을 기르세요. 배와 은이버섯을'],
    ['chushu', '처서', '폐와 위를 윤택하게 하세요. 깨와 꿀을'],
    ['bailu', '백로', '폐를 윤택하게 하고 건조함을 막으세요. 백합과 행인을'],
    ['qiufen', '추분', '음양의 균형을 맞추세요. 마와 구기자를'],
    ['hanlu', '한로', '음을 기르고 건조함을 막으세요. 깨와 찹쌀을'],
    ['shuangjiang', '상강', '부드럽게 폐를 보하세요. 감과 밤을'],
    ['lidong', '입동', '신양을 따뜻하게 보하세요. 양고기와 호두를'],
    ['xiaoxue', '소설', '온보로 추위에 대비하세요. 소고기와 대추를'],
    ['daxue', '대설', '온보로 양을 도우세요. 양고기와 용안육을'],
    ['dongzhi', '동지', '양기를 따뜻하게 보하세요. 만두와 양고기를'],
    ['xiaohan', '소한', '온보로 방한하세요. 양고기와 생강을'],
    ['dahan', '대한', '온보로 신을 기르세요. 검은콩과 검은깨를']
  ]
};

const extra = {
  'home.termLabel': { zh: '节气', en: 'Solar term', ja: '二十四節気', ko: '절기' },
  'home.termDate': { zh: '今日日期', en: 'Today', ja: '今日の日付', ko: '오늘 날짜' },
  'home.solarTitle': { zh: '二十四节气养生', en: 'Wellness by the 24 Solar Terms', ja: '二十四節気の養生', ko: '24절기 양생' },
  'quiz.entrySkipHint': {
    zh: '可随时在导航栏「体质测评」重新开始',
    en: 'You can restart anytime from “Constitution Test” in the navigation bar',
    ja: 'ナビゲーションの「体質テスト」からいつでもやり直せます',
    ko: '내비게이션의 「체질 테스트」에서 언제든 다시 시작할 수 있습니다'
  },
  'quiz.summaryTitle': { zh: '体质摘要', en: 'Constitution summary', ja: '体質サマリー', ko: '체질 요약' },
  'quiz.entryTitle': { zh: '进站引导小测', en: 'Quick entry assessment', ja: '入店ガイド小テスト', ko: '입장 안내 미니 테스트' }
};

// -------------------------------------------------------------- defect fixes
const fixes = {
  'en.json': {
    'quiz.quickLead': 'Short on time? Five quick questions locate your main constitution tendency and hand you a recommendation list right away.',
    'quiz.entryPopupLead': 'Three quick questions to help you find the heritage wellness goods that suit you best.'
  }
};

for (const f of ['en.json', 'ja.json', 'ko.json']) {
  const o = read(f);
  const lang = f.replace('.json', '');

  if (fixes[f]) {
    for (const [k, v] of Object.entries(fixes[f])) { o[k] = v; log.push(`${f}: fixed ${k}`); }
  }

  // ja: 文化百科 was left byte-identical to Chinese
  if (lang === 'ja') {
    for (const k of ['nav.articles', 'home.articlesBtn', 'articles.title']) {
      o[k] = '読みもの';
      log.push(`${f}: fixed ${k} -> 読みもの`);
    }
    // ja: non-Japanese 磁療 + Chinese-form 艾草/艾条 in product copy are patched in the product file
    // ja: heritage 香道文化 is acceptable kanji but make it explicitly Japanese
    o['products.categoryHeritage'] = o['products.categoryHeritage'] || '無形文化遺産の逸品';
  }

  for (const [k, v] of Object.entries(extra)) o[k] = v[lang];

  for (const [key, term, tip] of solar[lang]) {
    o[`solar.term.${key}`] = term;
    o[`solar.tip.${key}`] = tip;
  }

  write(f, o);
  log.push(`${f}: +${Object.keys(extra).length} extra keys, +${solar[lang].length * 2} solar keys`);
}

// --------------------------------------------------- ja products terminology
const jp = JSON.parse(fs.readFileSync('./data/_i18n/ja-products.json', 'utf8'));
const jaProductFixes = {
  1: { name_ja: '端午よもぎ養生ハンマー', heritage_ja: 'お灸の技' },
  4: { name_ja: '手作り陳年もぐさ棒', heritage_ja: 'お灸の技' },
  6: { name_ja: '緑檀磁気療法養生櫛', heritage_ja: '経絡養生' },
  10: { heritage_ja: '香道文化（こうどう）' },
  14: { name_ja: 'よもぎクッション', heritage_ja: 'よもぎ養生' }
};
for (const p of jp.products) {
  const fix = jaProductFixes[p.id];
  if (fix) { Object.assign(p, fix); log.push(`ja-products id=${p.id}: ${JSON.stringify(fix)}`); }
}
fs.writeFileSync('./data/_i18n/ja-products.json', JSON.stringify(jp, null, 2) + '\n', 'utf8');

// --------------------------------------------------- ko products terminology
const kp = JSON.parse(fs.readFileSync('./data/_i18n/ko-products.json', 'utf8'));
const koProductFixes = {
  17: { name_ko: '쑤저우 자수 양면 자수 단선', heritage_ko: '쑤저우 자수·무형문화유산' },
  25: { heritage_ko: '쑤저우 자수 기예' },
  26: { name_ko: '명제 마면군·덩굴 문양' },
  31: { name_ko: '한푸 요대·덩굴 문양' }
};
for (const p of kp.products) {
  const fix = koProductFixes[p.id];
  if (fix) { Object.assign(p, fix); log.push(`ko-products id=${p.id}: ${JSON.stringify(fix)}`); }
}
fs.writeFileSync('./data/_i18n/ko-products.json', JSON.stringify(kp, null, 2) + '\n', 'utf8');

// --------------------------------------------------- ko articles terminology
const ka = JSON.parse(fs.readFileSync('./data/_i18n/ko-articles.json', 'utf8'));
let koArticleHits = 0;
for (const a of ka.articles) {
  for (const f of ['title_ko', 'content_ko']) {
    if (typeof a[f] === 'string' && a[f].includes('소수')) {
      a[f] = a[f].split('소수').join('쑤저우 자수');
      koArticleHits++;
    }
  }
}
fs.writeFileSync('./data/_i18n/ko-articles.json', JSON.stringify(ka, null, 2) + '\n', 'utf8');
log.push(`ko-articles: replaced 소수 -> 쑤저우 자수 in ${koArticleHits} field(s)`);

console.log(log.join('\n'));

// ------------------------------------------------------------- self-check
const zhKeys = Object.keys(read('zh.json')).sort();
for (const f of ['en.json', 'ja.json', 'ko.json']) {
  const k = Object.keys(read(f)).sort();
  const missing = zhKeys.filter(x => !k.includes(x));
  const extraK = k.filter(x => !zhKeys.includes(x));
  console.log(`${f}: keys=${k.length} zh=${zhKeys.length} missing=${missing.length} extra=${extraK.length}${missing.length ? ' MISSING:' + missing.join(',') : ''}`);
}
