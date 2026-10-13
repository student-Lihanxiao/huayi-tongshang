/**
 * Repair the GBK mojibake in data/users.json and data/orders.json.
 *
 * History: those files were written by a GBK-configured editor, so the Chinese
 * was stored as UTF-8 bytes that decode to the wrong characters
 * (e.g. "朱瑞" -> "鏈辩懚"). The transform is exactly reversible:
 *   buffer = Buffer.from(mojibake, 'utf8')
 *   original = new TextDecoder('gbk').decode(buffer)
 */
const fs = require('fs');
const path = require('path');
const { TextDecoder } = require('util');

const GBK = new TextDecoder('gbk', { fatal: false });

function repair(str) {
  if (typeof str !== 'string' || !str) return str;
  const bytes = Buffer.from(str, 'utf8');
  return GBK.decode(bytes);
}

/**
 * This bug's output is built exclusively from rare CJK ideographs (U+9000-U+9FFF)
 * plus occasional punctuation. Genuine Chinese names ("朱瑞", "陈鹏") and order
 * fields ("待发货", "九蒸九晒黑芝麻丸") always contain at least one ideograph below
 * U+9000, so the two populations are cleanly separable.
 */
function isMojibake(str) {
  if (typeof str !== 'string' || !str) return false;
  return /[\u9000-\u9fff]/.test(str) && !/[\u4e00-\u8fff]/.test(str);
}

function walk(node, stats) {
  if (Array.isArray(node)) return node.map(v => walk(v, stats));
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = walk(v, stats);
    return out;
  }
  if (typeof node === 'string' && isMojibake(node)) {
    const fixed = repair(node);
    if (fixed && fixed !== node && !/[\uFFFD]/.test(fixed)) {
      stats.push(`${node}  ->  ${fixed}`);
      return fixed;
    }
  }
  return node;
}

for (const file of ['users.json', 'orders.json']) {
  const full = path.join(__dirname, '..', file);
  const doc = JSON.parse(fs.readFileSync(full, 'utf8'));
  const stats = [];
  const fixed = walk(doc, stats);

  console.log(`\n===== ${file} =====`);
  if (stats.length === 0) {
    console.log('  no mojibake detected');
  } else {
    stats.forEach(s => console.log('  ' + s));
  }

  // backup once, then write repaired UTF-8
  const bak = full + '.mojibake.bak';
  if (!fs.existsSync(bak)) fs.copyFileSync(full, bak);
  fs.writeFileSync(full, JSON.stringify(fixed, null, 2) + '\n', 'utf8');
  console.log(`  repaired ${stats.length} string(s); backup at ${path.basename(bak)}`);
}
