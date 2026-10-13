// 通过公网链接验证完整业务流程（模拟评委的操作）
const http = require('http');
const https = require('https');

const BASE = process.argv[2];
if (!BASE) {
  console.error('用法：node tools/_verify_public.js https://xxxx.trycloudflare.com');
  process.exit(1);
}

const lib = BASE.startsWith('https') ? https : http;

function req(method, path, { jar, form } = {}) {
  return new Promise((res, rej) => {
    const url = new URL(path, BASE);
    const body = form ? new URLSearchParams(form).toString() : null;
    const headers = {};
    if (body) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = Buffer.byteLength(body);
    }
    if (jar && Object.keys(jar).length) {
      headers['Cookie'] = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
    }
    const r = lib.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers
    }, (resp) => {
      let d = '';
      resp.setEncoding('utf8');
      resp.on('data', (c) => { d += c; });
      resp.on('end', () => {
        if (jar) {
          for (const raw of resp.headers['set-cookie'] || []) {
            const pair = raw.split(';')[0];
            const eq = pair.indexOf('=');
            if (eq > 0) jar[pair.slice(0, eq)] = pair.slice(eq + 1);
          }
        }
        res({ status: resp.statusCode, body: d, location: resp.headers.location });
      });
    });
    r.on('error', rej);
    if (body) r.write(body);
    r.end();
  });
}

const results = [];
function check(name, ok, detail) {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

(async () => {
  console.log('通过公网链接验证：' + BASE + '\n');

  // 1. 首页
  const home = await req('GET', '/?lang=zh');
  check('首页可访问', home.status === 200 && home.body.includes('华遗通商'));

  // 2. 体质测评完整流程
  const jar = {};
  await req('GET', '/?lang=zh', { jar });
  const quiz = await req('GET', '/quiz/full?lang=zh', { jar });
  check('完整测评页可访问', quiz.status === 200 && quiz.body.includes('quiz-step'));

  const form = { mode: 'full' };
  for (let i = 1; i <= 18; i++) form[`answers[f${i}]`] = String(i % 5);
  const submit = await req('POST', '/quiz/submit', { jar, form });
  check('提交测评成功', submit.status === 302);

  const result = await req('GET', '/quiz/result?lang=zh', { jar });
  const hasRec = /href="\/product\/\d+"/.test(result.body);
  check('结果页给出推荐商品', result.status === 200 && hasRec);

  // 3. 注册 + 加购 + 下单
  const user = `public_${Date.now()}`;
  const jar2 = {};
  await req('GET', '/?lang=zh', { jar: jar2 });
  const reg = await req('POST', '/register', { jar: jar2, form: { username: user, password: 'test123456', redirect: '/' } });
  check('注册成功', reg.status === 302, `user=${user}`);

  await req('POST', '/cart/add', { jar: jar2, form: { productId: '3', quantity: '1' } });
  const cart = await req('GET', '/cart?lang=zh', { jar: jar2 });
  check('加入购物车成功', cart.status === 200 && /198/.test(cart.body));

  const order = await req('POST', '/checkout', {
    jar: jar2,
    form: { name: '公网验证', phone: '13800000000', address: '测试地址', note: '' }
  });
  check('下单成功', order.status === 200 && /订单/.test(order.body));

  // 4. 四语言
  for (const l of ['en', 'ja', 'ko']) {
    const r = await req('GET', `/?lang=${l}`);
    check(`${l} 语言页可访问`, r.status === 200 && r.body.length > 10000);
  }

  // 5. SEO 资源
  const sitemap = await req('GET', '/sitemap.xml');
  check('sitemap.xml 可访问', sitemap.status === 200 && sitemap.body.includes('<urlset'));
  check('sitemap 使用公网域名', sitemap.body.includes(BASE.replace(/^https?:\/\//, '')));

  const pass = results.filter(Boolean).length;
  console.log(`\n=== 公网验证：PASS ${pass}  FAIL ${results.length - pass} ===`);
  process.exit(pass === results.length ? 0 : 1);
})();
