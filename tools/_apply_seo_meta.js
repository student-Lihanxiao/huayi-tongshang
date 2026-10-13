/**
 * 一次性脚本：给 server.js 的路由补上逐页 SEO 元信息（metaDescription / metaRobots）。
 * 每个 replace 都要求精确匹配一次，未命中会明确报错，避免静默失效。
 *
 * 用法（项目根目录）：node tools/_apply_seo_meta.js
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'server.js');
let src = fs.readFileSync(FILE, 'utf8');
const log = [];

function replaceOnce(name, from, to) {
  const count = src.split(from).length - 1;
  if (count !== 1) {
    throw new Error(`[${name}] 期望匹配 1 次，实际 ${count} 次，已中止（源码可能已变更）`);
  }
  src = src.replace(from, to);
  log.push(`✔ ${name}`);
}

// ---------------------------------------------------------------- 需要屏蔽收录的页面
const NOINDEX = "    metaRobots: 'noindex, follow',\n";

replaceOnce('cart 屏蔽收录',
  "  res.render('cart', { cart, total });",
  "  res.render('cart', { cart, total, metaRobots: 'noindex, follow' });"
);

replaceOnce('checkout 屏蔽收录',
  "  res.render('checkout', { cart, total });",
  "  res.render('checkout', { cart, total, metaRobots: 'noindex, follow' });"
);

replaceOnce('login 屏蔽收录',
  "  res.render('login', { redirect: req.query.redirect || '/', error: null });",
  "  res.render('login', { redirect: req.query.redirect || '/', error: null, metaRobots: 'noindex, follow' });"
);

replaceOnce('register 屏蔽收录',
  "  res.render('register', { redirect: req.query.redirect || '/', error: null });",
  "  res.render('register', { redirect: req.query.redirect || '/', error: null, metaRobots: 'noindex, follow' });"
);

// 登录/注册的错误重渲染也要带上
replaceOnce('login 错误页屏蔽收录',
  "    res.render('login', { redirect: redirect || '/', error: t(req.lang, 'login.error') });",
  "    res.render('login', { redirect: redirect || '/', error: t(req.lang, 'login.error'), metaRobots: 'noindex, follow' });"
);

replaceOnce('register 错误页屏蔽收录',
  "    return res.render('register', { redirect: redirect || '/', error: t(req.lang, 'register.exists') });",
  "    return res.render('register', { redirect: redirect || '/', error: t(req.lang, 'register.exists'), metaRobots: 'noindex, follow' });"
);

// 结果页与订单成功页属于个性化内容，不收录
replaceOnce('quiz 结果页屏蔽收录',
  "  res.render('quiz-result', {\n    mode: stored.mode,",
  "  res.render('quiz-result', {\n    metaRobots: 'noindex, follow',\n    mode: stored.mode,"
);

// ---------------------------------------------------------------- 列表页描述
replaceOnce('商品列表页描述',
  `  res.render('products', {
    products: filteredProducts,
    currentCategory: category,
    pageTitle: t(lang, titleKey),
    total: filteredProducts.length
  });`,
  `  res.render('products', {
    products: filteredProducts,
    currentCategory: category,
    pageTitle: t(lang, titleKey),
    total: filteredProducts.length,
    metaDescription: t(lang, 'meta.productsDescription', { n: filteredProducts.length })
  });`
);

replaceOnce('文章列表页描述',
  "  res.render('articles', { articles });",
  "  res.render('articles', { articles, metaDescription: t(lang, 'meta.articlesDescription') });"
);

replaceOnce('测评入口页描述',
  `  res.render('quiz', {
    quizDataTypes: CONSTITUTION_TYPES,`,
  `  res.render('quiz', {
    metaDescription: t(lang, 'meta.quizDescription'),
    quizDataTypes: CONSTITUTION_TYPES,`
);

replaceOnce('完整测评页描述',
  `  res.render('quiz-full', {
    questions: quizData.full.questions,`,
  `  res.render('quiz-full', {
    metaDescription: t(lang, 'meta.quizDescription'),
    questions: quizData.full.questions,`
);

replaceOnce('快速测评页描述',
  `  res.render('quiz-quick', {
    questions: quizData.quick.questions,`,
  `  res.render('quiz-quick', {
    metaDescription: t(lang, 'meta.quizDescription'),
    questions: quizData.quick.questions,`
);

// ---------------------------------------------------------------- 详情页使用自身内容
replaceOnce('商品详情页用商品描述',
  "  res.render('product', { product, relatedProducts });",
  `  res.render('product', {
    product,
    relatedProducts,
    metaTitle: product.name,
    metaDescription: (product.description || '').slice(0, 150),
    metaImage: product.image,
    ogType: 'article'
  });`
);

replaceOnce('文章详情页用文章内容',
  `  res.render('article', {
    article: {
      ...raw,
      title: loc(raw, 'title', lang),
      content: loc(raw, 'content', lang)
    }
  });`,
  `  const localizedArticle = {
    ...raw,
    title: loc(raw, 'title', lang),
    content: loc(raw, 'content', lang)
  };
  res.render('article', {
    article: localizedArticle,
    metaTitle: localizedArticle.title,
    metaDescription: (localizedArticle.content || '').replace(/\\s+/g, ' ').slice(0, 150),
    ogType: 'article'
  });`
);

fs.writeFileSync(FILE, src, 'utf8');
console.log(log.join('\n'));
console.log(`\n共应用 ${log.length} 处改动 -> ${FILE}`);
