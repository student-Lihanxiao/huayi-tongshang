/**
 * 存储失败提示文案（磁盘不可写时给用户明确反馈）
 *
 * 用法（项目根目录）：node tools/i18n/_add_storage_keys.js
 */
const fs = require('fs');
const path = require('path');

const LOCALES = path.join(__dirname, '..', '..', 'data', 'locales');

const A = {
  'register.storageError': {
    zh: '注册暂时失败：服务器存储不可写，请稍后重试或联系管理员。',
    en: 'Registration failed: server storage is not writable. Please try again later or contact the administrator.',
    ja: '登録に失敗しました：サーバーのストレージに書き込めません。しばらくしてから再度お試しいただくか、管理者にお問い合わせください。',
    ko: '가입에 실패했습니다: 서버 저장소에 쓸 수 없습니다. 잠시 후 다시 시도하거나 관리자에게 문의해 주세요.'
  },
  'checkout.storageError': {
    zh: '下单失败：服务器存储不可写，您的购物车已保留，请稍后重试。',
    en: 'Order failed: server storage is not writable. Your cart has been kept — please try again later.',
    ja: 'ご注文に失敗しました：サーバーのストレージに書き込めません。カートは保持されています。しばらくしてから再度お試しください。',
    ko: '주문에 실패했습니다: 서버 저장소에 쓸 수 없습니다. 장바구니는 유지되었으니 잠시 후 다시 시도해 주세요.'
  }
};

for (const lang of ['zh', 'en', 'ja', 'ko']) {
  const file = path.join(LOCALES, `${lang}.json`);
  const table = JSON.parse(fs.readFileSync(file, 'utf8'));
  let n = 0;
  for (const [k, v] of Object.entries(A)) {
    if (!(k in table)) { table[k] = v[lang]; n++; }
  }
  fs.writeFileSync(file, JSON.stringify(table, null, 2) + '\n', 'utf8');
  console.log(`${lang}.json: +${n}, total ${Object.keys(table).length}`);
}

const keys = (l) => Object.keys(JSON.parse(fs.readFileSync(path.join(LOCALES, `${l}.json`), 'utf8'))).sort();
const zh = keys('zh');
for (const l of ['en', 'ja', 'ko']) {
  const k = keys(l);
  console.log(`${l}: missing ${zh.filter((x) => !k.includes(x)).length}, extra ${k.filter((x) => !zh.includes(x)).length}`);
}
