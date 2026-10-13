/**
 * Merge ja/ko translation patches into products.json and articles.json.
 * Idempotent: re-running produces the same result.
 *
 * Run from the project root:   node tools/i18n/_merge.js
 * Paths resolve relative to this file, so the working directory does not matter.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', 'data') + path.sep;
const PATCH = path.join(__dirname, 'patches') + path.sep;
const P = (f) => JSON.parse(fs.readFileSync(ROOT + f, 'utf8'));
const W = (f, o) => fs.writeFileSync(ROOT + f, JSON.stringify(o, null, 2) + '\n', 'utf8');

const report = [];

// ------------------------------------------------------------------ products
const productsDoc = P('products.json');
const products = productsDoc.products;
const byId = new Map(products.map(p => [p.id, p]));

for (const lang of ['ja', 'ko']) {
  const patch = JSON.parse(fs.readFileSync(PATCH + `${lang}-products.json`, 'utf8'));
  let n = 0;
  for (const row of patch.products) {
    const target = byId.get(row.id);
    if (!target) throw new Error(`products: unknown id ${row.id} in ${lang} patch`);
    for (const field of ['name', 'description', 'heritage']) {
      const key = `${field}_${lang}`;
      const val = row[key];
      if (typeof val !== 'string' || !val.trim()) throw new Error(`products: empty ${key} for id ${row.id}`);
      target[key] = val.trim();
    }
    n++;
  }
  report.push(`products: merged ${n} ${lang} records (ids ${Math.min(...patch.products.map(r => r.id))}-${Math.max(...patch.products.map(r => r.id))})`);
}

W('products.json', productsDoc);

// ------------------------------------------------------------------ articles
const articlesDoc = P('articles.json');
const articles = articlesDoc.articles;
const artById = new Map(articles.map(a => [a.id, a]));

for (const lang of ['ja', 'ko']) {
  const patch = JSON.parse(fs.readFileSync(PATCH + `${lang}-articles.json`, 'utf8'));
  let n = 0;
  for (const row of patch.articles) {
    const target = artById.get(row.id);
    if (!target) throw new Error(`articles: unknown id ${row.id} in ${lang} patch`);
    for (const field of ['title', 'content']) {
      const key = `${field}_${lang}`;
      const val = row[key];
      if (typeof val !== 'string' || !val.trim()) throw new Error(`articles: empty ${key} for id ${row.id}`);
      target[key] = val.trim();
    }
    n++;
  }
  report.push(`articles: merged ${n} ${lang} records`);
}

W('articles.json', articlesDoc);

// --------------------------------------------------------------- verification
const check = (arr, fields, langs) => {
  const missing = [];
  for (const item of arr) {
    for (const f of fields) {
      for (const l of langs) {
        const k = `${f}_${l}`;
        if (typeof item[k] !== 'string' || !item[k].trim()) missing.push(`${k}#${item.id}`);
      }
    }
  }
  return missing;
};

const pLangs = ['en', 'ja', 'ko'];
const aLangs = ['en', 'ja', 'ko'];
const pMissing = check(products, ['name', 'description', 'heritage'], pLangs);
const aMissing = check(articles, ['title', 'content'], aLangs);

console.log(report.join('\n'));
console.log('---');
console.log('products:', products.length, 'missing localized fields:', pMissing.length, pMissing.slice(0, 20).join(' '));
console.log('articles:', articles.length, 'missing localized fields:', aMissing.length, aMissing.slice(0, 20).join(' '));

// sample output for eyeballing
console.log('--- sample product 17 (ja/ko) ---');
const s17 = byId.get(17);
console.log([s17.name, s17.name_en, s17.name_ja, s17.name_ko].join('\n'));
console.log('--- sample article 4 (ja/ko) ---');
const s4 = artById.get(4);
console.log([s4.title, s4.title_ja, s4.title_ko].join('\n'));
console.log(s4.content_ja);
console.log(s4.content_ko);
