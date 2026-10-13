/**
 * 端到端业务流验证：注册 -> 登录 -> 加购 -> 下单 -> 订单落盘
 * 用于确认生产化改造（内容/运行期数据分离、原子写入）没有破坏业务。
 *
 * 用法：node test/verify-flows.js [port]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.argv[2] || process.env.TEST_PORT || 3001);

// 运行期数据目录由服务端决定（可能是 data/runtime/、Docker 卷 /data 等），
// 所以直接从 /healthz 读取，避免测试脚本与实现不一致。
let DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');

function req(method, p, { jar, form } = {}) {
  return new Promise((res, rej) => {
    const body = form ? new URLSearchParams(form).toString() : null;
    const headers = {};
    if (body) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = Buffer.byteLength(body);
    }
    if (jar && Object.keys(jar).length) {
      headers['Cookie'] = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
    }
    const r = http.request({ host: '127.0.0.1', port: PORT, method, path: p, headers }, (resp) => {
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
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

(async () => {
  const jar = {};
  const user = `verify_${Date.now()}`;
  const pass = 'test123456';

  // 先问服务端真实的运行期数据目录
  const health = await req('GET', '/healthz');
  try {
    const info = JSON.parse(health.body);
    if (info.dataDir) DATA_DIR = info.dataDir;
    console.log(`ℹ️  运行期数据目录（取自 /healthz）：${DATA_DIR}`);
    if (!info.dataWritable) console.log('⚠️  服务端报告数据目录不可写，写入类断言会失败');
  } catch (e) {
    console.log('⚠️  无法解析 /healthz，沿用默认数据目录');
  }
  console.log('');

  await req('GET', '/?lang=zh', { jar });

  // ---------- 注册 ----------
  const reg = await req('POST', '/register', {
    jar,
    form: { username: user, password: pass, redirect: '/' }
  });
  check('注册成功并跳转', reg.status === 302, `status ${reg.status}`);

  // 用户在磁盘上确实存在
  const usersFile = path.join(DATA_DIR, 'users.json');
  let stored = null;
  try {
    stored = JSON.parse(fs.readFileSync(usersFile, 'utf8')).users.find((u) => u.username === user);
  } catch (e) { /* 文件可能读不到 */ }
  check('用户已持久化到 users.json', !!stored, stored ? `id=${stored.id}` : `未在 ${usersFile} 找到`);

  // ---------- 重复注册应被拒 ----------
  const jar2 = {};
  await req('GET', '/?lang=zh', { jar: jar2 });
  const dup = await req('POST', '/register', { jar: jar2, form: { username: user, password: pass, redirect: '/' } });
  check('重复用户名被拒绝', dup.status === 200 && /已存在|exists|存在|登録|가입/.test(dup.body), `status ${dup.status}`);

  // ---------- 退出后用同一账号登录 ----------
  await req('GET', '/logout', { jar });
  const jar3 = {};
  await req('GET', '/?lang=zh', { jar: jar3 });
  const login = await req('POST', '/login', { jar: jar3, form: { username: user, password: pass, redirect: '/' } });
  check('登录成功', login.status === 302, `status ${login.status}`);

  // ---------- 错误密码应失败 ----------
  const jar4 = {};
  await req('GET', '/?lang=zh', { jar: jar4 });
  const badLogin = await req('POST', '/login', { jar: jar4, form: { username: user, password: 'wrong-password', redirect: '/' } });
  check('错误密码被拒绝', badLogin.status === 200 && /错误|incorrect|正しく|잘못|error/i.test(badLogin.body), `status ${badLogin.status}`);

  // ---------- 加入购物车 ----------
  const add = await req('POST', '/cart/add', { jar: jar3, form: { productId: '3', quantity: '2' } });
  check('加入购物车', add.status === 302, `status ${add.status}`);
  const cart = await req('GET', '/cart?lang=zh', { jar: jar3 });
  check('购物车显示商品与金额', cart.status === 200 && /396/.test(cart.body), '预期合计 ¥396（198×2）');

  // ---------- 购物车数量增减与删除 ----------
  const inc = await req('GET', '/cart/update/3/1', { jar: jar3 });
  check('购物车增加数量', inc.status === 302, `status ${inc.status}`);
  const afterInc = await req('GET', '/cart?lang=zh', { jar: jar3 });
  check('增加后合计变为 ¥594（198×3）', /594/.test(afterInc.body));

  const dec = await req('GET', '/cart/update/3/-1', { jar: jar3 });
  check('购物车减少数量', dec.status === 302, `status ${dec.status}`);
  const afterDec = await req('GET', '/cart?lang=zh', { jar: jar3 });
  check('减少后合计回到 ¥396（198×2）', /396/.test(afterDec.body));

  // 删除后购物车应为空，随后重新加入以继续下单流程
  const rm = await req('GET', '/cart/remove/3', { jar: jar3 });
  check('购物车删除商品', rm.status === 302, `status ${rm.status}`);
  const afterRm = await req('GET', '/cart?lang=zh', { jar: jar3 });
  check('删除后购物车为空', /空空如也|empty|カートは空|장바구니가 비어/.test(afterRm.body));

  await req('POST', '/cart/add', { jar: jar3, form: { productId: '3', quantity: '2' } });

  // ---------- 结算页需登录 ----------
  const jarAnon = {};
  await req('GET', '/?lang=zh', { jar: jarAnon });
  const anonCheckout = await req('GET', '/checkout', { jar: jarAnon });
  check('未登录访问结算被重定向到登录', anonCheckout.status === 302 && /login/.test(anonCheckout.location || ''), `-> ${anonCheckout.location}`);

  // ---------- 下单 ----------
  const order = await req('POST', '/checkout', {
    jar: jar3,
    form: { name: '验证测试', phone: '13800000000', address: '测试地址 1 号', note: '自动化测试订单' }
  });
  check('下单成功并显示订单', order.status === 200 && /订单/.test(order.body), `status ${order.status}`);

  // 订单确实落盘
  const orderIdMatch = order.body.match(/<strong>(\d+)<\/strong>/);
  const ordersFile = path.join(DATA_DIR, 'orders.json');
  let orderStored = null;
  try {
    orderStored = JSON.parse(fs.readFileSync(ordersFile, 'utf8')).orders.slice(-1)[0];
  } catch (e) { /* ignore */ }
  check('订单已持久化到 orders.json', !!orderStored, orderStored ? `id=${orderStored.id}, total=${orderStored.total}` : `未在 ${ordersFile} 找到`);

  // ---------- 购物车已清空 ----------
  const cartAfter = await req('GET', '/cart?lang=zh', { jar: jar3 });
  check('下单后购物车已清空', /空空如也|empty|カートは空|장바구니가 비어/.test(cartAfter.body));

  // ---------- 清理测试数据 ----------
  try {
    const doc = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    doc.users = doc.users.filter((u) => u.username !== user);
    fs.writeFileSync(usersFile, JSON.stringify(doc, null, 2) + '\n', 'utf8');

    const od = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
    od.orders = od.orders.filter((o) => o.note !== '自动化测试订单');
    fs.writeFileSync(ordersFile, JSON.stringify(od, null, 2) + '\n', 'utf8');
    console.log('\n🧹 已清理本次测试产生的用户与订单');
  } catch (e) {
    console.log('\n⚠️  清理测试数据失败：' + e.message);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== 业务流程验证：PASS ${results.length - failed.length}  FAIL ${failed.length} ===`);
  process.exit(failed.length ? 1 : 0);
})();
