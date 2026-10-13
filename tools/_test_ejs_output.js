// 验证 EJS 编译产物里是否存在 __output 变量，以及能否从中取出 <title> 文本
// 我们的 head-meta partial 依赖这个机制来生成 og:title。
const ejs = require('ejs');

const template = [
  '<title><%= name %></title>',
  '<%',
  '  const m = (typeof __output === "string" ? __output : "").match(/<title>([\\s\\S]*?)<\\/title>/);',
  '  const got = m ? m[1] : "(取不到)";',
  '%>',
  'RESULT:[<%= got %>]'
].join('\n');

const fn = ejs.compile(template, { client: false });

// 1) 普通变量（会转义）
console.log('测试 1（普通变量）:', fn({ name: '华遗通商 - 测试标题' }));

// 2) 含 HTML 的原始输出，模拟各视图里 <%= %> 与 <%- %> 混用的情况
const template2 = [
  '<title><%= brand %> - <%= tagline %></title>',
  '<% const m = (typeof __output === "string" ? __output : "").match(/<title>([\\s\\S]*?)<\\/title>/); %>',
  'OG_TITLE:[<%= m ? m[1] : "(取不到)" %>]'
].join('\n');
console.log('测试 2（多段拼接）:', ejs.compile(template2)({ brand: '华遗通商', tagline: '让非遗好物走进日常' }));

// 3) 确认 __output 在循环内也是累积的
const template3 = [
  '<title>页面标题</title>',
  '<% for (let i = 0; i < 3; i++) { __append(i) } %>',
  '<% const m = (typeof __output === "string" ? __output : "").match(/<title>([\\s\\S]*?)<\\/title>/); %>',
  'LOOP_OG:[<%= m ? m[1] : "(取不到)" %>]'
].join('\n');
console.log('测试 3（循环后读取）:', ejs.compile(template3)({}));

// 4) 是否会被转义影响（标题里含 & 等字符）
const template4 = [
  '<title><%= t %></title>',
  '<% const m = (typeof __output === "string" ? __output : "").match(/<title>([\\s\\S]*?)<\\/title>/); %>',
  'ESC:[<%= m ? m[1] : "(取不到)" %>]'
].join('\n');
console.log('测试 4（含转义字符）:', ejs.compile(template4)({ t: 'A & B <测试>' }));
