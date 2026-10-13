/**
 * 路由覆盖检查：从 server.js 提取全部路由定义，与实际测试清单比对。
 * 目的：防止新增路由后忘记补测试（曾因此漏掉 /quiz 的 500 错误）。
 *
 * 用法（项目根目录）：node test/verify-coverage.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SERVER = path.join(ROOT, 'server.js');
const ROUTES_TEST = path.join(__dirname, 'verify-routes.js');
const FLOWS_TEST = path.join(__dirname, 'verify-flows.js');

// ---------------------------------------------------------------- 提取路由
const src = fs.readFileSync(SERVER, 'utf8');
const defined = [...src.matchAll(/app\.(get|post)\(\s*'([^']+)'/g)]
  .map((m) => ({ method: m[1].toUpperCase(), path: m[2] }));

// ---------------------------------------------------------------- 提取测试覆盖
// verify-routes.js 里的 pages 数组（GET 路径）
const routesSrc = fs.readFileSync(ROUTES_TEST, 'utf8');
const pageBlock = routesSrc.split('const pages = [')[1].split('];')[0];
const pagePaths = [...pageBlock.matchAll(/\['([^']+)'/g)].map((m) => m[1].split('?')[0]);

// verify-routes.js 里 quiz 流程显式访问的路径
const quizPaths = [...routesSrc.matchAll(/request\('(GET|POST)',\s*[`'"]([^`'"?]+)/g)]
  .map((m) => m[2]);

// verify-flows.js 里显式访问的路径
const flowsSrc = fs.readFileSync(FLOWS_TEST, 'utf8');
const flowPaths = [...flowsSrc.matchAll(/req\('(GET|POST)',\s*'([^'?]+)/g)].map((m) => m[2]);

// verify-seo.js 里显式访问的路径（robots.txt / sitemap.xml / 图标等）
const SEO_TEST = path.join(__dirname, 'verify-seo.js');
const seoSrc = fs.readFileSync(SEO_TEST, 'utf8');
const seoPaths = [...seoSrc.matchAll(/'(\/[a-z0-9._/-]+)'/gi)].map((m) => m[1]);

const covered = new Set(
  [...pagePaths, ...quizPaths, ...flowPaths, ...seoPaths]
    .map((p) => (p.length > 1 ? p.replace(/\/$/, '') : p))
);

// ---------------------------------------------------------------- 比对
// 参数化路由归一到实际测试用的具体路径（如 /product/:id -> /product/1 视为已覆盖）
function isCovered(routePath) {
  if (covered.has(routePath)) return true;
  if (routePath.includes(':')) {
    const prefix = routePath.split('/:')[0] + '/';
    return [...covered].some((c) => c.startsWith(prefix));
  }
  // /cart/remove/:id 这类带参数的路径，按前缀匹配父级
  return [...covered].some((c) => c === routePath);
}

// 只保留确实无法通过 HTTP 自动化验证的路由，并写明理由。
// 注意：凡是能被请求验证的，都应补进上面的测试文件，而不是加到这里。
const EXEMPT = new Map([
  ['/entry-quiz/done', '纯前端 fetch 调用（仅返回 JSON 标记），无页面输出，由浏览器端弹窗逻辑使用']
]);

const missing = [];
const exempted = [];

for (const r of defined) {
  if (isCovered(r.path) || [...covered].some((c) => c === r.path)) continue;

  let matched = false;
  for (const [p] of EXEMPT) {
    if (r.path === p) {
      matched = true;
      exempted.push(`${r.method} ${r.path}  — ${EXEMPT.get(p)}`);
      break;
    }
  }
  if (!matched) missing.push(`${r.method} ${r.path}`);
}

console.log(`已定义路由：${defined.length} 个`);
console.log(`测试清单覆盖：${covered.size} 条路径`);
console.log('');

if (exempted.length) {
  console.log('免测（已在其他测试或前端流程中覆盖）：');
  exempted.forEach((e) => console.log('  · ' + e));
  console.log('');
}

if (missing.length) {
  console.log('❌ 以下路由未被任何测试覆盖：');
  missing.forEach((m) => console.log('  ! ' + m));
  console.log('\n请在 test/verify-routes.js 的 pages 数组里补上对应路径。');
  process.exit(1);
}

console.log('✅ 全部路由均已被测试覆盖（或已登记免测原因）');
