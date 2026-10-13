// 打印某个 URL 的 HTTP 状态；若是 EJS 报错页则解码显示错误栈，否则显示 head 片段
const http = require('http');

const target = process.argv[2] || 'http://127.0.0.1:3001/?lang=zh';
const lines = Number(process.argv[3] || 30);

http.get(target, (r) => {
  let d = '';
  r.setEncoding('utf8');
  r.on('data', (c) => { d += c; });
  r.on('end', () => {
    console.log('STATUS:', r.statusCode, ' BYTES:', d.length);

    const decode = (s) => s
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&');

    const err = d.match(/<pre>([\s\S]*?)<\/pre>/);
    if (err) {
      console.log('--- 服务端错误 ---');
      console.log(decode(err[1]).split('\n').slice(0, lines).join('\n'));
      return;
    }

    const head = d.match(/<head[\s\S]*?<\/head>/i);
    console.log('--- head 内容 ---');
    console.log((head ? head[0] : d).split('\n').slice(0, lines).join('\n'));
  });
}).on('error', (e) => console.log('REQUEST ERROR:', e.message));
