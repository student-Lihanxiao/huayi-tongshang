/**
 * 一次性脚本：把 SEO/分享卡片 partial 注入到所有视图的 <title> 之后。
 * 幂等：已注入过的文件会跳过。
 *
 * 用法（项目根目录）：node tools/_inject_head_meta.js
 */
const fs = require('fs');
const path = require('path');

const VIEWS = path.join(__dirname, '..', 'views');
const INCLUDE = "  <%- include('partials/head-meta') %>";

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.ejs')) out.push(p);
  }
  return out;
}

let injected = 0;
let skipped = 0;
const problems = [];

for (const file of walk(VIEWS)) {
  const rel = path.relative(VIEWS, file).replace(/\\/g, '/');

  // partial 自身不需要注入
  if (rel.startsWith('partials/')) { skipped++; continue; }

  let src = fs.readFileSync(file, 'utf8');

  if (src.includes("include('partials/head-meta')")) { skipped++; continue; }

  // 找到 <title>...</title> 那一行，在后面插入
  const m = src.match(/^[ \t]*<title>[\s\S]*?<\/title>[ \t]*\r?\n/m);
  if (!m) {
    problems.push(`${rel}: 找不到 <title> 行`);
    continue;
  }

  const insertAt = m.index + m[0].length;
  src = src.slice(0, insertAt) + INCLUDE + '\n' + src.slice(insertAt);

  fs.writeFileSync(file, src, 'utf8');
  injected++;
  console.log('✔ ' + rel);
}

console.log(`\n注入完成：${injected} 个文件，跳过 ${skipped} 个`);
if (problems.length) {
  console.log('\n⚠️ 以下文件需要手工处理：');
  problems.forEach((p) => console.log('   ' + p));
}
