/**
 * Add the locale keys still needed by the remaining views.
 * Appends to all four tables in place, preserving insertion order.
 */
const fs = require('fs');
const path = require('path');
const DIR = './data/locales';

const additions = {
  'articles.empty': {
    zh: '暂无文章', en: 'No articles yet', ja: '記事はまだありません', ko: '아직 글이 없습니다'
  },
  'orderSuccess.submitted': {
    zh: '订单提交成功',
    en: 'Order placed successfully',
    ja: 'ご注文が完了しました',
    ko: '주문이 성공적으로 접수되었습니다'
  },
  'orderSuccess.thanksShort': {
    zh: '感谢您的购买，我们将尽快为您发货',
    en: 'Thank you for your purchase — we will ship your order as soon as possible',
    ja: 'ご購入ありがとうございます。できるだけ早く発送いたします',
    ko: '구매해 주셔서 감사합니다. 최대한 빠르게 발송해 드리겠습니다'
  },
  'orderSuccess.orderNoLabel': {
    zh: '订单号：', en: 'Order number: ', ja: 'ご注文番号：', ko: '주문 번호: '
  },
  'orderSuccess.amountLabel': {
    zh: '订单金额：', en: 'Order total: ', ja: 'ご注文金額：', ko: '주문 금액: '
  },
  'orderSuccess.backHome': {
    zh: '返回首页', en: 'Back to home', ja: 'ホームに戻る', ko: '홈으로 돌아가기'
  }
};

for (const lang of ['zh', 'en', 'ja', 'ko']) {
  const file = path.join(DIR, `${lang}.json`);
  const table = JSON.parse(fs.readFileSync(file, 'utf8'));
  let added = 0;
  for (const [key, values] of Object.entries(additions)) {
    if (!(key in table)) { table[key] = values[lang]; added++; }
  }
  fs.writeFileSync(file, JSON.stringify(table, null, 2) + '\n', 'utf8');
  console.log(`${lang}.json: +${added} keys, total ${Object.keys(table).length}`);
}

// parity check
const keys = (l) => Object.keys(JSON.parse(fs.readFileSync(path.join(DIR, `${l}.json`), 'utf8'))).sort();
const zh = keys('zh');
for (const l of ['en', 'ja', 'ko']) {
  const k = keys(l);
  console.log(`${l}: missing ${zh.filter(x => !k.includes(x)).length}, extra ${k.filter(x => !zh.includes(x)).length}`);
}
