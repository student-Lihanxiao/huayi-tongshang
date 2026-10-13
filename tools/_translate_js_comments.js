/**
 * 把 <script> 块里的中文 JS 注释改为英文。
 *
 * 为什么需要：服务端 <% %> 注释编译后不会输出，是安全的；
 * 但 <script> 里的 // 与 /* *\/ 注释会原样发给浏览器，
 * 导致非中文页面出现中文残留（已被 verify-routes 的 CJK 检测抓到）。
 *
 * 用法（项目根目录）：node tools/_translate_js_comments.js
 */
const fs = require('fs');
const path = require('path');

const VIEWS = path.join(__dirname, '..', 'views');

const REPLACEMENTS = [
  ['// 语言切换时保留当前页面与查询参数，只替换 lang',
    '// Keep the current page and query string on language switch; only replace lang'],
  ['// 货币转换', '// Currency conversion'],
  ['// 结果页价格同样支持货币换算', '// Currency conversion for the result page'],
  ['// 老访客不再打扰：session 标记 + 本地标记双重判断',
    '// Skip returning visitors: dual check via session flag and localStorage'],
  ['// 稍作延迟再弹出，避免打断首屏渲染',
    '// Slight delay before showing, so first paint is not interrupted'],
  ['// 进度文案模板，{n}/{total} 交给前端替换',
    '// Progress label template; {n} and {total} are substituted on the client'],
  ['// 选中后自动前进（最后一题除外）',
    '// Auto-advance after selecting (except on the last question)'],
  ['/* 首次进站引导小测弹窗', '/* First-visit entry quiz modal'],
  ['/* 测评表单', '/* Assessment form'],
  ['/* 体质标识映射：EJS 的 with 作用域不会传递进闭包，所以这里预先生成普通对象 */',
    '/* Constitution label map. EJS "with" scope does not reach into closures, so build a plain object here. */'],
  ['/* 体质测评结果页', '/* Assessment result page']
];

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.ejs')) out.push(p);
  }
  return out;
}

let total = 0;
for (const file of walk(VIEWS)) {
  let src = fs.readFileSync(file, 'utf8');
  const before = src;
  let n = 0;

  for (const [from, to] of REPLACEMENTS) {
    while (src.includes(from)) {
      src = src.replace(from, to);
      n++;
    }
  }

  // 兜底：<script> 块内任何仍含中文的行内注释整行注释内容翻译为占位英文
  const parts = src.split(/(<script[\s\S]*?<\/script>)/i);
  for (let i = 1; i < parts.length; i += 2) {
    parts[i] = parts[i].replace(/\/\/([^\n]*[\u4e00-\u9fff][^\n]*)/g, () => {
      n++;
      return '// (comment localised)';
    });
  }
  src = parts.join('');

  if (src !== before) {
    fs.writeFileSync(file, src, 'utf8');
    total += n;
    console.log(`✔ ${path.relative(VIEWS, file).replace(/\\/g, '/')}  (${n} 处)`);
  }
}

console.log(`\n共处理 ${total} 处注释`);
