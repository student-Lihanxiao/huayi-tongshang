// 修复一键启动脚本的编码问题
//
// 背景：Windows PowerShell 5.1 读取 .ps1 时，若文件无 UTF-8 BOM，
// 会按系统 ANSI（中文环境为 GBK）解码，导致脚本内中文变成乱码、
// 字符串不闭合、语法报错，双击 bat 表现为"闪退无反应"。
//
// 同时 CMD 解析 .bat 需要 CRLF 行尾，LF 在某些情况下会导致命令被截断。
//
// 用法（项目根目录）：node tools/_fix_launcher_encoding.js

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

function report(file, before, after) {
  console.log(`  ${file}`);
  console.log(`    修改前: BOM=${before.bom ? '有' : '无'}  CRLF=${before.crlf ? '有' : '无'}  ${before.size} 字节`);
  console.log(`    修改后: BOM=${after.bom ? '有' : '无'}  CRLF=${after.crlf ? '有' : '无'}  ${after.size} 字节`);
}

function inspect(buf) {
  return {
    bom: buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF,
    crlf: buf.includes(Buffer.from('\r\n')),
    size: buf.length
  };
}

// ---------------------------------------------------------------- .ps1 加 BOM
const ps1 = path.join(ROOT, 'tools', 'launch.ps1');
{
  let buf = fs.readFileSync(ps1);
  const before = inspect(buf);

  // 去掉可能已有的 BOM，统一重建
  if (before.bom) buf = buf.slice(3);

  // 内容保持 UTF-8 文本，行尾统一 CRLF（PowerShell 两种都行，统一更稳）
  let text = buf.toString('utf8').replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
  const out = Buffer.concat([BOM, Buffer.from(text, 'utf8')]);

  fs.writeFileSync(ps1, out);
  report('tools/launch.ps1', before, inspect(fs.readFileSync(ps1)));
}

// ---------------------------------------------------------------- .bat 转 CRLF
for (const name of ['启动.bat']) {
  const p = path.join(ROOT, name);
  if (!fs.existsSync(p)) { console.log(`  ${name} 不存在，跳过`); continue; }

  let buf = fs.readFileSync(p);
  const before = inspect(buf);
  if (before.bom) buf = buf.slice(3);

  let text = buf.toString('utf8').replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
  fs.writeFileSync(p, Buffer.from(text, 'utf8'));
  report(name, before, inspect(fs.readFileSync(p)));
}

console.log('\n完成。');
