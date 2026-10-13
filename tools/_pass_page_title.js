/**
 * 一次性脚本：让每个视图把「已渲染的 <title> 内容」传给 head-meta partial。
 *
 * 原因：head-meta 里的 og:title 需要与页面实际标题一致。
 * 若只拿 site.name，社交卡片上就只有一个光秃秃的品牌名。
 * 做法：在 <title> 行后插入一行抓取脚本，并把值传给 include。
 *
 * 幂等：已处理过的文件会跳过。
 * 用法（项目根目录）：node tools/_pass_page_title.js
 */
const fs = require('fs');
const path = require('path');

const VIEWS = path.join(__dirname, '..', 'views');

const OLD_INCLUDE = "  <%- include('partials/head-meta') %>";
const NEW_BLOCK = [
  "  <%",
  "    /* 取本页已渲染的 <title> 文本，供 head-meta 生成 og:title。",
  "       注意：__output 里的标题已经过 EJS 转义（& 变成 &amp;），",
  "       这里先解码回原始文本，再由 head-meta 统一转义一次，避免双重转义。 */",
  "    const pageTitleFromTag = (() => {",
  "      const html = typeof __output === 'string' ? __output : '';",
  "      const m = html.match(/<title>([\\s\\S]*?)<\\/title>/);",
  "      if (!m) return '';",
  "      return m[1]",
  "        .replace(/&lt;/g, '<')",
  "        .replace(/&gt;/g, '>')",
  "        .replace(/&quot;/g, '\"')",
  "        .replace(/&#39;/g, \"'\")",
  "        .replace(/&amp;/g, '&');",
  "    })();",
  "  %>",
  "  <%- include('partials/head-meta', { pageTitleFromTag: pageTitleFromTag }) %>"
].join('\n');

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.ejs')) out.push(p);
  }
  return out;
}

let updated = 0;
let skipped = 0;

for (const file of walk(VIEWS)) {
  const rel = path.relative(VIEWS, file).replace(/\\/g, '/');
  if (rel.startsWith('partials/')) { skipped++; continue; }

  let src = fs.readFileSync(file, 'utf8');

  if (src.includes('pageTitleFromTag')) { skipped++; continue; }
  if (!src.includes(OLD_INCLUDE)) {
    console.log(`  ⚠️ ${rel}: 未找到 head-meta include，跳过`);
    skipped++;
    continue;
  }

  src = src.replace(OLD_INCLUDE, NEW_BLOCK);
  fs.writeFileSync(file, src, 'utf8');
  updated++;
  console.log('  ✔ ' + rel);
}

console.log(`\n更新 ${updated} 个视图，跳过 ${skipped} 个`);
