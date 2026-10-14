// 隧道稳定性压测：连续请求公网地址，统计成功率与失败原因
// 用法：node tools/_stability_test.js https://xxx.trycloudflare.com [轮数] [间隔秒]
const https = require('https');

const BASE = process.argv[2];
const ROUNDS = Number(process.argv[3] || 10);
const GAP_MS = Number(process.argv[4] || 6) * 1000;

if (!BASE) {
  console.error('用法：node tools/_stability_test.js https://xxx.trycloudflare.com [轮数] [间隔秒]');
  process.exit(1);
}

function hit(path) {
  return new Promise((res) => {
    const url = new URL(path, BASE);
    const t0 = Date.now();
    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'User-Agent': 'stability-probe/1.0' }
    }, (r) => {
      let n = 0;
      r.on('data', (c) => { n += c.length; });
      r.on('end', () => res({ ok: r.statusCode === 200, status: r.statusCode, ms: Date.now() - t0, bytes: n }));
    });
    req.on('error', (e) => res({ ok: false, error: e.message, ms: Date.now() - t0 }));
    req.setTimeout(25000, () => { req.destroy(); res({ ok: false, error: 'timeout', ms: Date.now() - t0 }); });
    req.end();
  });
}

(async () => {
  console.log(`压测目标: ${BASE}`);
  console.log(`共 ${ROUNDS} 轮，间隔 ${GAP_MS / 1000} 秒\n`);

  let ok = 0;
  const failures = [];
  const times = [];

  for (let i = 1; i <= ROUNDS; i++) {
    const r = await hit('/healthz');
    const stamp = new Date().toTimeString().slice(0, 8);
    if (r.ok) {
      ok++;
      times.push(r.ms);
      console.log(`  [${stamp}] 第 ${String(i).padStart(2)} 轮  ✓ 200   ${String(r.ms).padStart(5)}ms`);
    } else {
      failures.push(`第${i}轮: ${r.error || 'HTTP ' + r.status}`);
      console.log(`  [${stamp}] 第 ${String(i).padStart(2)} 轮  ✗ ${r.error || 'HTTP ' + r.status}   ${r.ms}ms`);
    }
    if (i < ROUNDS) await new Promise((r2) => setTimeout(r2, GAP_MS));
  }

  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const max = times.length ? Math.max(...times) : 0;

  console.log('\n' + '='.repeat(58));
  console.log(`成功率: ${ok}/${ROUNDS}  (${Math.round((ok / ROUNDS) * 100)}%)`);
  if (times.length) console.log(`响应时间: 平均 ${avg}ms，最慢 ${max}ms`);
  if (failures.length) {
    console.log('失败明细:');
    failures.forEach((f) => console.log('  · ' + f));
  }
  console.log('='.repeat(58));
  process.exit(failures.length ? 1 : 0);
})();
