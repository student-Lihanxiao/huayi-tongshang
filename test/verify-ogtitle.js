// 校验各页面的 og:title 是否与页面 <title> 完全一致
const http = require('http');
const PORT = Number(process.argv[2] || 3001);

const PAGES = [
  ['/?lang=zh', '首页'],
  ['/products?lang=zh', '商品列表'],
  ['/product/3?lang=zh', '商品详情'],
  ['/article/2?lang=zh', '文章详情'],
  ['/features?lang=zh', '作品说明'],
  ['/quiz?lang=zh', '测评入口'],
  ['/about?lang=zh', '品牌故事'],
  ['/?lang=en', '英文首页'],
  ['/?lang=ja', '日文首页'],
  ['/?lang=ko', '韩文首页']
];

function get(p) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: PORT, path: p }, (r) => {
      let d = '';
      r.setEncoding('utf8');
      r.on('data', (c) => { d += c; });
      r.on('end', () => res({ status: r.statusCode, body: d }));
    }).on('error', rej);
  });
}

function pick(html, re) {
  const m = html.match(re);
  return m ? m[1] : null;
}

(async () => {
  let pass = 0;
  const fails = [];

  for (const [p, label] of PAGES) {
    const { status, body } = await get(p);
    if (status !== 200) {
      console.log(`❌ ${label}: status ${status}`);
      fails.push(label);
      continue;
    }

    const title = pick(body, /<title>([\s\S]*?)<\/title>/);
    const ogTitle = pick(body, /<meta property="og:title" content="([^"]*)"/);
    const ogDesc = pick(body, /<meta property="og:description" content="([^"]*)"/);

    // og:title 在 HTML 里是转义过的，比对时把 title 也转义
    const esc = (s) => String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const same = ogTitle === esc(title);
    const noDoubleEscape = !/&amp;(amp|lt|gt|quot|#39);/.test(ogTitle || '');
    const hasDesc = !!ogDesc && ogDesc.length > 10;

    if (same && noDoubleEscape && hasDesc) {
      pass++;
      console.log(`✅ ${label.padEnd(8)} og:title = ${ogTitle}`);
    } else {
      fails.push(label);
      console.log(`❌ ${label}`);
      console.log(`     title    : ${title}`);
      console.log(`     og:title : ${ogTitle}`);
      if (!noDoubleEscape) console.log('     ⚠️ 出现双重转义');
      if (!hasDesc) console.log(`     ⚠️ og:description 异常: ${ogDesc}`);
    }
  }

  console.log(`\n=== og:title 一致性：PASS ${pass}  FAIL ${fails.length} ===`);
  if (fails.length) console.log('失败页面: ' + fails.join(', '));
  process.exit(fails.length ? 1 : 0);
})();
