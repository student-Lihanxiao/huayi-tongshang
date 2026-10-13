/**
 * 把视图中所有含中文的 HTML 注释翻译为英文。
 *
 * 为什么需要：HTML 注释会原样发送给浏览器，
 * 导致英文/日文/韩文页面出现中文残留（已被 verify-routes 的 CJK 检测抓到）。
 *
 * 用法（项目根目录）：node tools/_translate_html_comments.js
 */
const fs = require('fs');
const path = require('path');

const VIEWS = path.join(__dirname, '..', 'views');

// 已知注释的英文对照表；未命中的会退化为通用英文占位，并打印出来以便人工确认
const DICT = {
  '多语言互指，避免四个语言版本被判重复内容':
    'Cross-language links so the four locale versions are not treated as duplicate content',
  '站点图标': 'Site icons',
  '社交分享卡片': 'Social sharing card',
  '品牌 Logo': 'Brand logo',
  '移动端折叠按钮': 'Mobile collapse button',
  '导航菜单': 'Navigation menu',
  '首页': 'Home',
  '商品分类下拉菜单': 'Product category dropdown',
  '体质测评': 'Constitution assessment',
  '文化百科': 'Culture library',
  '购物车（带角标）': 'Cart (with badge)',
  '用户状态：登录/未登录': 'User state: signed in / signed out',
  '已登录：显示用户名 + 退出登录按钮': 'Signed in: username and sign-out button',
  '未登录：显示登录/注册按钮': 'Signed out: sign-in and sign-up buttons',
  '语言切换': 'Language switcher',
  '品牌介绍': 'Brand introduction',
  '关于我们': 'About us',
  '帮助中心': 'Help centre',
  '关注我们': 'Follow us',
  'Hero 区域': 'Hero section',
  '体质测评入口': 'Assessment entry point',
  '24节气卡片': '24 solar terms card',
  '养生好物模块': 'Wellness products section',
  '非遗瑰宝模块': 'Heritage treasures section',
  '汉服风华模块': 'Hanfu section',
  '养生文化百科模块': 'Wellness knowledge section',
  '相关推荐': 'Related products',
  '分类头部': 'Category header',
  '分类筛选标签': 'Category filter tabs',
  '主导体质': 'Primary constitution',
  '兼夹体质': 'Secondary constitution',
  '九种体质得分明细': 'Score breakdown for all nine constitutions',
  '调养方案': 'Care plan',
  '养生好物推荐': 'Wellness product recommendations',
  '非遗美学生活推荐': 'Heritage lifestyle recommendations',
  '操作区': 'Actions',
  '页头': 'Page header',
  '数据概览': 'Key numbers',
  '核心亮点': 'Core highlights',
  '技术实现': 'Technical implementation',
  '演示路径': 'Demo walkthrough'
};

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
const untranslated = [];

for (const file of walk(VIEWS)) {
  let src = fs.readFileSync(file, 'utf8');
  const before = src;

  // 逐条替换含中文的 HTML 注释
  src = src.replace(/<!--(?:(?!-->)[\s\S])*?[\u4e00-\u9fff](?:(?!-->)[\s\S])*?-->/g, (full) => {
    // 取出注释内的文本，按已知词典做整体匹配
    const inner = full.replace(/^<!--/, '').replace(/-->$/, '').trim();
    for (const [zh, en] of Object.entries(DICT)) {
      if (inner.includes(zh)) {
        total++;
        // 保留原本可能存在的 ===== 装饰
        const decorated = /=====/.test(inner) ? `<!-- ===== ${en} ===== -->` : `<!-- ${en} -->`;
        return decorated;
      }
    }
    untranslated.push(`${path.relative(VIEWS, file).replace(/\\/g, '/')}: ${inner.slice(0, 50)}`);
    total++;
    return `<!-- ${inner.replace(/[\u4e00-\u9fff]/g, '').replace(/\s+/g, ' ').trim() || 'section'} -->`;
  });

  if (src !== before) {
    fs.writeFileSync(file, src, 'utf8');
    console.log('✔ ' + path.relative(VIEWS, file).replace(/\\/g, '/'));
  }
}

console.log(`\n共处理 ${total} 处 HTML 注释`);
if (untranslated.length) {
  console.log('\n以下注释未在词典中，已做机械清理，建议人工确认：');
  untranslated.forEach((u) => console.log('  · ' + u));
}

// 复核
let left = 0;
for (const file of walk(VIEWS)) {
  const m = fs.readFileSync(file, 'utf8').match(/<!--(?:(?!-->)[\s\S])*?[\u4e00-\u9fff](?:(?!-->)[\s\S])*?-->/g);
  if (m) left += m.length;
}
console.log(left === 0 ? '\n✅ 全站已无中文 HTML 注释' : `\n⚠️ 仍有 ${left} 处`);
