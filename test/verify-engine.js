/**
 * Validate the scoring + recommendation ENGINE end to end.
 * For each of the 9 constitutions, craft answers that should produce that type,
 * then assert the recommended products are the ones mapped to it.
 *
 * Usage: node test/verify-engine.js [port]      (default 3001, or TEST_PORT env)
 *
 * Set-Cookie parsing note: the session id value itself contains '=', so we must
 * split only on the FIRST '=' or the cookie value gets truncated.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.argv[2] || process.env.TEST_PORT || 3001);
const DATA = path.join(__dirname, '..', 'data');
const readData = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));

const constitution = readData('constitution.json');
const products = readData('products.json').products;
const quizQuestions = readData('quiz-questions.json');

const productById = new Map(products.map((p) => [p.id, p]));

function req(method, path, { jar, form } = {}) {
  return new Promise((res, rej) => {
    const body = form ? new URLSearchParams(form).toString() : null;
    const headers = {};
    if (body) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = Buffer.byteLength(body);
    }
    if (jar && Object.keys(jar).length) {
      headers['Cookie'] = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
    }
    const r = http.request({ host: '127.0.0.1', port: PORT, method, path, headers }, (resp) => {
      let d = '';
      resp.setEncoding('utf8');
      resp.on('data', (c) => { d += c; });
      resp.on('end', () => {
        // merge cookies into the jar, splitting on the first '=' only
        if (jar) {
          for (const raw of resp.headers['set-cookie'] || []) {
            const pair = raw.split(';')[0];
            const eq = pair.indexOf('=');
            if (eq > 0) jar[pair.slice(0, eq)] = pair.slice(eq + 1);
          }
        }
        res({ status: resp.statusCode, body: d, location: resp.headers.location });
      });
    });
    r.on('error', rej);
    if (body) r.write(body);
    r.end();
  });
}

// Fresh session: hit the home page first so the session cookie is established.
async function freshSession(lang) {
  const jar = {};
  await req('GET', `/?lang=${lang}`, { jar });
  return jar;
}

function primaryFrom(body) {
  // the hero heading holds the localized constitution name
  const m = body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

function recommendedIds(body) {
  const ids = [...body.matchAll(/href="\/product\/(\d+)"/g)].map((m) => Number(m[1]));
  return [...new Set(ids)];
}

async function runFullQuiz(highType, lang = 'zh') {
  const jar = await freshSession(lang);
  const form = { mode: 'full' };
  for (const q of quizQuestions.full.questions) {
    form[`answers[${q.id}]`] = q.type === highType ? '4' : '0';
  }
  const post = await req('POST', '/quiz/submit', { jar, form });
  const r = await req('GET', `/quiz/result?lang=${lang}`, { jar });
  return { post, result: r };
}

let pass = 0;
const fails = [];

(async () => {
  console.log('=== FULL QUIZ: each constitution must be detected and matched ===\n');

  for (const type of constitution.types) {
    const { post, result } = await runFullQuiz(type.key);
    const primary = primaryFrom(result.body);
    const ids = recommendedIds(result.body);

    const expectedIds = Object.entries(constitution.productProfile.primary)
      .filter(([, v]) => v.types.includes(type.key))
      .map(([id]) => Number(id));
    const missing = expectedIds.filter((id) => !ids.includes(id));

    // 主循环统一以中文断言（服务端在无 lang 参数且无 session 语言时兜底英文）
    const lang = 'zh';
    const expectName = type.name;
    const typeOk = primary === expectName;
    const ok = post.status === 302 && result.status === 200 && typeOk && missing.length === 0;

    const shown = ids.map((id) => (productById.get(id) || {}).name).filter(Boolean);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${type.key.padEnd(7)} primary=${String(primary).padEnd(6)} expected=${expectName}`);
    console.log(`        recommended (${ids.length}): ${shown.join(' / ') || '(none)'}`);
    if (!typeOk) console.log(`        !! wrong constitution detected`);
    if (missing.length) {
      console.log(`        !! missing mapped products: ${missing.map((id) => productById.get(id).name).join(', ')}`);
    }

    if (ok) pass++;
    else fails.push(`${type.key}: primary=${primary} expected=${expectName} missing=${missing.join(',')}`);
  }

  // ---------------------------------------------------- entry quiz goals
  console.log('\n=== ENTRY QUIZ: each goal must map to the right constitution ===');
  const goalExpect = {
    energy: '气虚质', warmth: '阳虚质', sleep: '气郁质',
    digest: '痰湿质', skin: '湿热质', balance: '平和质'
  };
  for (const [goal, expected] of Object.entries(goalExpect)) {
    const jar = await freshSession('zh');
    const post = await req('POST', '/quiz/entry', { jar, form: { goal, scene: 'food', budget: 'mid' } });
    const r = await req('GET', '/quiz/result?lang=zh', { jar });
    const primary = primaryFrom(r.body);
    const ids = recommendedIds(r.body);
    const ok = post.status === 302 && primary === expected && ids.length > 0;
    console.log(`${ok ? 'PASS' : 'FAIL'}  goal=${goal.padEnd(8)} -> ${String(primary).padEnd(6)} (expected ${expected}), ${ids.length} products`);
    if (ok) pass++; else fails.push(`entry/${goal}: got ${primary}`);
  }

  // ---------------------------------------------------- budget filter
  console.log('\n=== ENTRY BUDGET FILTER (budget=low must cap at 100 CNY) ===');
  {
    const jar = await freshSession('zh');
    await req('POST', '/quiz/entry', { jar, form: { goal: 'energy', scene: 'food', budget: 'low' } });
    const r = await req('GET', '/quiz/result?lang=zh', { jar });
    const ids = recommendedIds(r.body);
    const over = ids.filter((id) => productById.get(id).price > 100);
    const ok = over.length === 0 && ids.length > 0;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${ids.length} products, prices: ${ids.map((i) => productById.get(i).price).join(', ')}`);
    if (ok) pass++; else fails.push(`budget filter: over-budget ${over.join(',')}`);
  }

  // ---------------------------------------- theme invariant + i18n of results
  console.log('\n=== THEME INVARIANT + RESULT LOCALISATION ===');
  {
    let bad = 0;
    for (const type of constitution.types) {
      const { result } = await runFullQuiz(type.key);
      const first = result.body.match(/href="\/product\/(\d+)"/);
      if (first) {
        const p = productById.get(Number(first[1]));
        if (p.category !== '养生') {
          bad++;
          console.log(`  FAIL ${type.key}: leads with ${p.category} (${p.name})`);
        }
      }
    }
    console.log(`${bad === 0 ? 'PASS' : 'FAIL'}  all 9 constitutions lead with a 养生 category product`);
    if (bad === 0) pass++; else fails.push('theme invariant broken');

    // localized result headings
    for (const [lang, expect] of [['en', 'Qi-Deficient'], ['ja', '気虚'], ['ko', '기허']]) {
      const { result } = await runFullQuiz('qixu', lang);
      const primary = primaryFrom(result.body);
      const ok = primary && primary.includes(expect);
      console.log(`${ok ? 'PASS' : 'FAIL'}  result page lang=${lang} heading="${primary}" (expect contains "${expect}")`);
      if (ok) pass++; else fails.push(`result i18n ${lang}: ${primary}`);
    }
  }

  console.log(`\n=== ENGINE RESULTS: PASS ${pass}  FAIL ${fails.length} ===`);
  fails.forEach((f) => console.log('  ' + f));
  process.exit(fails.length ? 1 : 0);
})();
