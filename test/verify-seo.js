// 校验 SEO / 分享卡片元信息是否正确输出
const http = require('http');
const PORT = Number(process.argv[2] || 3001);

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

function meta(html, re) {
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

(async () => {
  // ---------- 首页 ----------
  const home = (await get('/?lang=zh')).body;
  const desc = meta(home, /<meta name="description" content="([^"]*)"/);
  check('首页有 meta description', !!desc && desc.length > 20, desc ? desc.slice(0, 60) + '…' : '缺失');
  check('首页有 og:title', /<meta property="og:title"/.test(home));
  check('首页有 og:image（分享预览图）', /og:image" content="http:\/\/[^"]*\/images\/og-cover\.png"/.test(home));
  check('首页有 canonical', /<link rel="canonical" href="http:\/\/[^"]*\/"/.test(home));
  check('首页 canonical 不含 ?lang=', !/rel="canonical" href="[^"]*\?/.test(home));
  check('首页有 hreflang 四语言互指', (home.match(/hreflang="/g) || []).length === 5,
    `找到 ${(home.match(/hreflang="/g) || []).length} 个 hreflang（4 语言 + x-default）`);
  check('首页有 favicon 引用', /rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"/.test(home));
  check('首页 robots 允许收录', /name="robots" content="index, follow"/.test(home));

  // ---------- 商品详情页：应用商品自身信息 ----------
  const prod = (await get('/product/3?lang=zh')).body;
  const pTitle = meta(prod, /<meta property="og:title" content="([^"]*)"/);
  const pImg = meta(prod, /<meta property="og:image" content="([^"]*)"/);
  const pDesc = meta(prod, /<meta name="description" content="([^"]*)"/);
  check('商品页 og:title 用商品名', !!pTitle && pTitle.includes('十年陈皮老白茶'), pTitle);
  check('商品页 og:image 用商品图', !!pImg && pImg.includes('/images/health/chenpi-tea.jpg'), pImg);
  check('商品页 description 用商品描述', !!pDesc && pDesc.length > 10, pDesc ? pDesc.slice(0, 50) + '…' : '缺失');

  // ---------- 文章详情页 ----------
  const art = (await get('/article/2?lang=zh')).body;
  const aTitle = meta(art, /<meta property="og:title" content="([^"]*)"/);
  check('文章页 og:title 用文章标题', !!aTitle && aTitle.includes('艾草'), aTitle);
  check('文章页 og:type 为 article', /og:type" content="article"/.test(art));

  // ---------- 商品列表页：带数量 ----------
  const list = (await get('/products?lang=zh')).body;
  const lDesc = meta(list, /<meta name="description" content="([^"]*)"/);
  check('商品列表 description 含商品数量', !!lDesc && /32/.test(lDesc), lDesc);

  // ---------- 需要屏蔽收录的页面 ----------
  for (const [p, label] of [['/cart', '购物车'], ['/login', '登录页'], ['/register', '注册页']]) {
    const html = (await get(p)).body;
    check(`${label} 设为 noindex`, /name="robots" content="noindex, follow"/.test(html));
  }

  // ---------- 英文页面描述已本地化 ----------
  const en = (await get('/?lang=en')).body;
  const enDesc = meta(en, /<meta name="description" content="([^"]*)"/);
  check('英文页描述为英文', !!enDesc && !/[\u4e00-\u9fff]/.test(enDesc.replace(/华遗通商|Huayi Tongshang/g, '')), enDesc ? enDesc.slice(0, 60) + '…' : '缺失');

  // ---------- 图标文件可访问 ----------
  for (const icon of ['/favicon.svg', '/favicon.ico', '/apple-touch-icon.png', '/images/icon-192.png', '/images/og-cover.png']) {
    const r = await get(icon);
    check(`图标可访问 ${icon}`, r.status === 200, `status ${r.status}`);
  }

  // og:image 指向的文件必须真实存在，否则分享出去是空白卡片
  const ogRef = meta(home, /<meta property="og:image" content="([^"]*)"/);
  const ogPath = ogRef ? ogRef.replace(/^https?:\/\/[^/]+/, '') : '';
  const ogRes = await get(ogPath);
  check('og:image 指向的文件真实存在', ogRes.status === 200, `${ogPath} -> status ${ogRes.status}`);

  // ---------- 搜索引擎抓取入口 ----------
  const robots = await get('/robots.txt');
  check('robots.txt 可访问', robots.status === 200, `status ${robots.status}`);
  check('robots.txt 声明了 sitemap', /Sitemap:\s*https?:\/\/\S+\/sitemap\.xml/.test(robots.body));
  check('robots.txt 屏蔽购物车与结算', /Disallow: \/cart/.test(robots.body) && /Disallow: \/checkout/.test(robots.body));

  const sitemap = await get('/sitemap.xml');
  check('sitemap.xml 可访问', sitemap.status === 200, `status ${sitemap.status}`);
  const urlCount = (sitemap.body.match(/<url>/g) || []).length;
  check('sitemap 含全部商品与文章', urlCount >= 32 + 28, `共 ${urlCount} 条 URL`);
  check('sitemap 是合法 XML 头', sitemap.body.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));

  const health = await get('/healthz');
  check('healthz 返回 JSON 且数据目录可写',
    health.status === 200 && /"dataWritable":true/.test(health.body),
    health.body.slice(0, 90));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== SEO/分享卡片验证：PASS ${results.length - failed.length}  FAIL ${failed.length} ===`);
  process.exit(failed.length ? 1 : 0);
})();
