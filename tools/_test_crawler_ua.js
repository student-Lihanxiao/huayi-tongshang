// 用微信 / QQ / Twitter 的抓取 UA 请求公网页面，模拟平台爬虫看到什么
const https = require('https');
const http = require('http');

const BASE = process.argv[2];
if (!BASE) {
  console.error('用法：node tools/_test_crawler_ua.js https://xxxx.trycloudflare.com');
  process.exit(1);
}

const UAS = [
  ['微信 Android', 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107 Mobile Safari/537.36 MicroMessenger/8.0.40.2420(0x28002837) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64'],
  ['微信 iOS', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.40(0x18002832) NetType/WIFI Language/zh_CN'],
  ['QQ', 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107 Mobile Safari/537.36 QQ/8.9.63.10375'],
  ['Twitterbot', 'Twitterbot/1.0'],
  ['普通浏览器（对照）', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36']
];

function fetchWith(ua, path) {
  return new Promise((res) => {
    const url = new URL(path, BASE);
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'User-Agent': ua, 'Accept': 'text/html,image/*,*/*' }
    }, (r) => {
      let d = '';
      r.setEncoding('utf8');
      r.on('data', (c) => { d += c; });
      r.on('end', () => res({ status: r.statusCode, body: d, headers: r.headers }));
    });
    req.on('error', (e) => res({ error: e.message }));
    req.setTimeout(20000, () => { req.destroy(); res({ error: 'timeout' }); });
    req.end();
  });
}

(async () => {
  console.log('目标: ' + BASE + '\n');

  for (const [name, ua] of UAS) {
    const r = await fetchWith(ua, '/?lang=zh');
    if (r.error) {
      console.log(`❌ ${name}: ${r.error}`);
      continue;
    }
    const ogTitle = (r.body.match(/<meta property="og:title" content="([^"]*)"/) || [])[1] || '(缺失)';
    const ogImage = (r.body.match(/<meta property="og:image" content="([^"]*)"/) || [])[1] || '(缺失)';
    const isHtml = (r.headers['content-type'] || '').includes('html');
    console.log(`${r.status === 200 && isHtml ? '✅' : '⚠️ '} ${name}: status=${r.status} type=${r.headers['content-type'] || '?'}`);
    console.log(`      og:title = ${ogTitle}`);
    console.log(`      og:image = ${ogImage}`);
  }

  console.log('\n--- 单独测试 og:image 能否被抓取 ---');
  for (const [name, ua] of [UAS[0], UAS[3]]) {
    const r = await fetchWith(ua, '/images/og-cover.png');
    if (r.error) {
      console.log(`❌ ${name}: ${r.error}`);
    } else {
      console.log(`${r.status === 200 ? '✅' : '❌'} ${name}: status=${r.status} type=${r.headers['content-type']} len=${r.headers['content-length']}`);
    }
  }
})();
