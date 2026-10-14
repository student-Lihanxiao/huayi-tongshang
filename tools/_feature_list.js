// 扫描项目，汇总真实的功能清单（路由、数据、语言、测试）
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
const products = read('data/products.json').products;
const articles = read('data/articles.json').articles;
const constitution = read('data/constitution.json');
const quiz = read('data/quiz-questions.json');
const locales = read('data/locales/zh.json');

// ---------------- 路由 ----------------
const routes = [...server.matchAll(/app\.(get|post)\(\s*'([^']+)'/g)]
  .map((m) => `${m[1].toUpperCase()} ${m[2]}`);

// ---------------- 视图 ----------------
function walk(dir, ext, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, out);
    else if (e.name.endsWith(ext)) out.push(path.relative(ROOT, p).replace(/\\/g, '/'));
  }
  return out;
}
const views = walk(path.join(ROOT, 'views'), '.ejs');

// ---------------- 测试 ----------------
const tests = walk(path.join(ROOT, 'test'), '.js');

// ---------------- 商品分类统计 ----------------
const byCat = {};
for (const p of products) byCat[p.category] = (byCat[p.category] || 0) + 1;

// ---------------- 翻译覆盖 ----------------
const langs = ['zh', 'en', 'ja', 'ko'];
const transCoverage = {};
for (const lang of langs) {
  let n = 0;
  for (const p of products) {
    if (lang === 'zh') { n++; continue; }
    if (p[`name_${lang}`] && p[`description_${lang}`] && p[`heritage_${lang}`]) n++;
  }
  transCoverage[`products.${lang}`] = `${n}/${products.length}`;
}
for (const lang of langs) {
  let n = 0;
  for (const a of articles) {
    if (lang === 'zh') { n++; continue; }
    if (a[`title_${lang}`] && a[`content_${lang}`]) n++;
  }
  transCoverage[`articles.${lang}`] = `${n}/${articles.length}`;
}

// ---------------- 输出 ----------------
console.log('════════════ 项目实际功能清单 ════════════\n');

console.log('【数据规模】');
console.log(`  商品          ${products.length} 件  (${Object.entries(byCat).map(([k, v]) => k + ' ' + v).join(' / ')})`);
console.log(`  科普文章      ${articles.length} 篇`);
console.log(`  体质类型      ${constitution.types.length} 种`);
console.log(`  完整量表      ${quiz.full.questions.length} 题`);
console.log(`  快速测评      ${quiz.quick.questions.length} 题`);
console.log(`  进站引导      ${quiz.entry.steps.length} 步`);
console.log(`  界面文案      ${Object.keys(locales).length} 条`);
console.log(`  支持语言      ${langs.join(' / ')}`);
console.log('');

console.log('【翻译覆盖度】');
for (const [k, v] of Object.entries(transCoverage)) {
  const [a, b] = v.split('/');
  console.log(`  ${k.padEnd(16)} ${v} ${a === b ? '✓' : '✗ 缺失'}`);
}
console.log('');

console.log(`【后端路由】共 ${routes.length} 条`);
for (const r of routes) console.log('  ' + r);
console.log('');

console.log(`【视图模板】共 ${views.length} 个`);
views.forEach((v) => console.log('  ' + v));
console.log('');

console.log(`【自动化测试】共 ${tests.length} 个套件`);
tests.forEach((t) => console.log('  ' + t));
console.log('');

console.log('【体质类型】');
constitution.types.forEach((t) => {
  const mapped = Object.values(constitution.productProfile.primary).filter((p) => p.types.includes(t.key)).length;
  console.log(`  ${t.icon} ${t.name.padEnd(5)} ${t.nameEn.padEnd(34)} 关联商品 ${mapped} 件`);
});
console.log('');
