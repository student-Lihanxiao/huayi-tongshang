// 校验 render.yaml（免费版）的关键配置项
const fs = require('fs');
const t = fs.readFileSync('render.yaml', 'utf8');

// 去掉注释行后再检查「是否有生效的 disk 配置」
const active = t.split('\n')
  .filter((l) => !/^\s*#/.test(l))
  .join('\n');

const checks = [
  ['plan 为 free', /plan:\s*free/],
  ['runtime 为 docker', /runtime:\s*docker/],
  ['dockerfilePath 指向 ./Dockerfile', /dockerfilePath:\s*\.\/Dockerfile/],
  ['healthCheckPath 为 /healthz', /healthCheckPath:\s*\/healthz/],
  ['NODE_ENV=production', /key:\s*NODE_ENV[\s\S]{0,40}value:\s*production/],
  ['SESSION_SECRET 自动生成', /key:\s*SESSION_SECRET[\s\S]{0,40}generateValue:\s*true/],
  ['COOKIE_SECURE=true', /key:\s*COOKIE_SECURE[\s\S]{0,40}value:\s*"true"/],
  ['PUBLIC_URL 已设置', /key:\s*PUBLIC_URL/],
  // 注意：只匹配 envVars 下的实际条目（形如 "- key: PORT"），
  // 否则会命中注释里提到的 PORT / DATA_DIR 造成误报。
  ['未把 PORT 写入环境变量（应由平台注入）', !/-\s*key:\s*PORT\b/.test(t)],
  ['未把 DATA_DIR 写入环境变量（免费版不用磁盘）', !/-\s*key:\s*DATA_DIR\b/.test(t)],
  ['无生效的 disk 段', !/^\s*disk:/m.test(active)]
];

let ok = true;
for (const [name, test] of checks) {
  const hit = typeof test === 'boolean' ? test : test.test(t);
  console.log(`${hit ? '✅' : '❌'} ${name}`);
  if (!hit) ok = false;
}

// 额外：确认注释里保留了升级付费版的说明
console.log(`${/mountPath:\s*\/data/.test(t) ? '✅' : '❌'} 注释中保留了付费版升级说明（mountPath: /data）`);

console.log(ok ? '\nrender.yaml 配置正确（免费版）' : '\n⚠️ 配置存在问题');
process.exit(ok ? 0 : 1);
