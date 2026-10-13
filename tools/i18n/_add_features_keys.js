/**
 * 作品说明页（/features）的多语言文案
 * 用途：竞赛答辩时集中展示功能亮点与技术实现
 *
 * 用法（项目根目录）：node tools/i18n/_add_features_keys.js
 */
const fs = require('fs');
const path = require('path');

const LOCALES = path.join(__dirname, '..', '..', 'data', 'locales');

const A = {
  // ---------------- 页面骨架 ----------------
  'feat.nav': { zh: '作品说明', en: 'About the project', ja: '作品について', ko: '작품 소개' },
  'feat.title': { zh: '作品说明', en: 'Project Overview', ja: '作品説明', ko: '작품 설명' },
  'feat.lead': {
    zh: '华遗通商 —— 把中医体质测评与非遗好物推荐结合起来的四语言电商平台。',
    en: 'Huayi Tongshang — a four-language commerce platform that connects TCM constitution assessment with heritage-craft recommendations.',
    ja: '華遺通商 —— 中医学の体質チェックと無形文化遺産の逸品推薦を結びつけた四言語のECプラットフォーム。',
    ko: '화유통상 — 중의학 체질 진단과 무형문화유산 추천을 결합한 4개 언어 전자상거래 플랫폼입니다.'
  },

  // ---------------- 数据概览 ----------------
  'feat.statConstitution': { zh: '种中医体质', en: 'TCM constitutions', ja: '種の中医学体質', ko: '가지 중의학 체질' },
  'feat.statQuestions': { zh: '题完整量表', en: 'question full scale', ja: '問の完全尺度', ko: '문항 정밀 척도' },
  'feat.statQuick': { zh: '题快速测评', en: 'question quick test', ja: '問の簡易チェック', ko: '문항 간편 진단' },
  'feat.statProducts': { zh: '件非遗好物', en: 'heritage products', ja: '点の逸品', ko: '개 아이템' },
  'feat.statLanguages': { zh: '种界面语言', en: 'languages', ja: '言語対応', ko: '개 언어' },
  'feat.statTests': { zh: '项自动化测试', en: 'automated checks', ja: '項目の自動テスト', ko: '개 자동 테스트' },

  // ---------------- 核心亮点 ----------------
  'feat.highlights': { zh: '核心亮点', en: 'Core highlights', ja: '主要なポイント', ko: '핵심 특징' },

  'feat.h1Title': { zh: '九种体质测评', en: 'Nine-constitution assessment', ja: '九種体質チェック', ko: '9가지 체질 진단' },
  'feat.h1Text': {
    zh: '依据中华中医药学会《中医体质分类与判定》标准，18 题完整量表判定主导与兼夹体质，另设 5 题快速版与首次进站 3 步引导，覆盖从"随便看看"到"认真了解自己"的全部用户。结果含得分明细、典型表现、成因、调理建议、宜忌与非遗调养路径。',
    en: 'Based on the TCM constitution classification standard, an 18-question scale determines your primary and secondary constitutions, with a 5-question quick version and a 3-step first-visit guide. Results include score breakdown, typical signs, causes, care advice, dietary guidance and a heritage wellness path.',
    ja: '中医体質分類の標準に基づき、18問の完全尺度で主体質と兼夾体質を判定。5問の簡易版と初回訪問時の3ステップガイドも用意。結果には得点明細・典型的な症状・成因・養生アドバイス・食養生・無形文化遺産の養生ルートが含まれます。',
    ko: '중의학 체질 분류 표준에 따라 18문항 정밀 척도로 주 체질과 겸협 체질을 판정합니다. 5문항 간편 버전과 첫 방문 3단계 가이드도 제공합니다. 결과에는 점수 상세, 대표 증상, 원인, 관리 조언, 식이 지침, 무형문화유산 양생 경로가 포함됩니다.'
  },

  'feat.h2Title': { zh: '体质驱动的推荐算法', en: 'Constitution-driven recommendations', ja: '体質に基づく推薦アルゴリズム', ko: '체질 기반 추천 알고리즘' },
  'feat.h2Text': {
    zh: '养生商品按「主导体质 +50 / 兼夹 +25」打分，并乘以"专精系数"——只针对一种体质的商品比覆盖四种的通用款得分更高，避免通用款挤掉精准款。非遗器物与汉服按气质契合度做第二层推荐，并支持价位区间过滤。',
    en: 'Wellness products are scored by primary constitution (+50) and secondary (+25), multiplied by a specificity factor so single-constitution items outrank broad ones. Heritage crafts and hanfu form a second recommendation layer based on temperament fit, with optional price-range filtering.',
    ja: '養生商品は「主体質 +50／兼夾 +25」で採点し、さらに「専門性係数」を掛けます。一種類の体質に特化した商品が、四種類にまたがる汎用品より上位に来るため、汎用品が的確な商品を押しのけることを防ぎます。無形文化遺産の器物と漢服は気質の相性で第二層の推薦を行い、価格帯での絞り込みにも対応。',
    ko: '양생 상품은 주 체질 +50, 겸협 +25로 점수를 매기고 "전문성 계수"를 곱합니다. 한 가지 체질에 특화된 상품이 네 가지를 아우르는 범용품보다 높은 점수를 받아, 범용품이 정확한 상품을 밀어내지 않도록 합니다. 무형문화유산 기물과 한푸는 기질 적합도로 2차 추천하며 가격대 필터도 지원합니다.'
  },

  'feat.h3Title': { zh: '中英日韩四语言', en: 'Four languages', ja: '中国語・英語・日本語・韓国語', ko: '중·영·일·한 4개 언어' },
  'feat.h3Text': {
    zh: '369 条界面文案、32 件商品、28 篇文章全部完成四语言本地化，商品描述与非遗工艺名逐条翻译；切换语言保留当前页面，并配有 canonical 与 hreflang，让四个语言版本各自被搜索引擎识别。',
    en: 'All 369 UI strings, 32 products and 28 articles are localized in four languages, including per-item translations of descriptions and craft names. Switching language preserves the current page, and canonical plus hreflang tags let search engines treat each language version correctly.',
    ja: '369件のUI文言、32点の商品、28本の記事を四言語に完全ローカライズ。商品説明と無形文化遺産の技名も一点ずつ翻訳しています。言語切替時は現在のページを維持し、canonical と hreflang により各言語版が検索エンジンに正しく認識されます。',
    ko: '369개의 UI 문구, 32개 상품, 28개 글을 4개 언어로 완전히 현지화했습니다. 상품 설명과 무형문화유산 기예 명칭도 항목별로 번역했습니다. 언어 전환 시 현재 페이지가 유지되며 canonical과 hreflang으로 각 언어 버전이 검색엔진에 올바르게 인식됩니다.'
  },

  'feat.h4Title': { zh: '工程健壮性', en: 'Engineering robustness', ja: 'エンジニアリングの堅牢性', ko: '엔지니어링 견고성' },
  'feat.h4Text': {
    zh: '内容数据与用户数据分离：即使持久化磁盘挂载错误，站点仍能完整访问，只在写入时明确提示，而不是整站崩溃。数据写入采用「临时文件 + 原子重命名」，避免中途中断损坏 JSON；生产环境启用 gzip、安全响应头与静态资源缓存。',
    en: 'Content and user data are separated, so even if the persistent disk is misconfigured the site stays fully browsable — writes fail with a clear message instead of crashing the app. Writes use a temp-file plus atomic rename to prevent corrupted JSON, and production enables gzip, security headers and static caching.',
    ja: 'コンテンツデータとユーザーデータを分離。永続ディスクのマウントを誤っても、サイトは完全に閲覧でき、書き込み時のみ明確に通知します（全体クラッシュはしません）。書き込みは一時ファイル＋アトミックリネームでJSON破損を防止。本番では gzip・セキュリティヘッダ・静的キャッシュを有効化。',
    ko: '콘텐츠 데이터와 사용자 데이터를 분리해, 영구 디스크 마운트가 잘못되어도 사이트는 완전히 열람되며 쓰기 시에만 명확히 알립니다(전체 크래시 없음). 쓰기는 임시 파일 + 원자적 이름 변경으로 JSON 손상을 방지하고, 프로덕션에서는 gzip·보안 헤더·정적 캐시를 사용합니다.'
  },

  // ---------------- 技术实现 ----------------
  'feat.tech': { zh: '技术实现', en: 'Technical implementation', ja: '技術的な実装', ko: '기술 구현' },
  'feat.techStack': { zh: '技术栈', en: 'Stack', ja: '技術スタック', ko: '기술 스택' },
  'feat.techStackValue': {
    zh: 'Node.js + Express + EJS 服务端渲染；JSON 文件存储；无数据库依赖，便于一键部署。',
    en: 'Node.js + Express + EJS server-side rendering; JSON file storage; no database dependency, so it deploys in one step.',
    ja: 'Node.js + Express + EJS のサーバーサイドレンダリング。JSONファイル保存。データベース不要でワンクリック配備が可能。',
    ko: 'Node.js + Express + EJS 서버 사이드 렌더링, JSON 파일 저장, 데이터베이스 의존성 없음으로 간편 배포.'
  },
  'feat.techI18n': { zh: '多语言方案', en: 'i18n approach', ja: '多言語の仕組み', ko: '다국어 방식' },
  'feat.techI18nValue': {
    zh: '扁平化 key-value 语言表 + 模板内 t() 取词；字段级回退（缺失语言→英文→中文），保证任何页面不会出现空白或报错。',
    en: 'Flat key-value locale tables with t() lookups in templates; field-level fallback (missing language to English to Chinese) so no page ever renders blank or throws.',
    ja: 'フラットなkey-value言語表とテンプレート内の t() 参照。フィールド単位のフォールバック（欠落言語→英語→中国語）で、空白やエラーが発生しません。',
    ko: '플랫 키-값 언어 테이블과 템플릿 내 t() 조회. 필드 단위 폴백(누락 언어→영어→중국어)으로 빈 화면이나 오류가 발생하지 않습니다.'
  },
  'feat.techSeo': { zh: 'SEO 与分享', en: 'SEO and sharing', ja: 'SEOと共有', ko: 'SEO와 공유' },
  'feat.techSeoValue': {
    zh: '每页独立 meta description、canonical、hreflang 互指、Open Graph 分享卡片与站点地图，商品页与文章页自动使用自身标题与配图。',
    en: 'Per-page meta description, canonical, hreflang cross-links, Open Graph cards and a sitemap; product and article pages automatically use their own title and image.',
    ja: 'ページごとの meta description、canonical、hreflang 相互参照、Open Graph カード、サイトマップ。商品ページと記事ページは自身のタイトルと画像を自動使用。',
    ko: '페이지별 meta description, canonical, hreflang 상호 참조, Open Graph 카드, 사이트맵. 상품과 글 페이지는 자체 제목과 이미지를 자동 사용합니다.'
  },
  'feat.techTest': { zh: '质量保障', en: 'Quality assurance', ja: '品質保証', ko: '품질 보증' },
  'feat.techTestValue': {
    zh: '5 个自动化测试套件：路由与四语言渲染、推荐引擎正确性、业务流程闭环、SEO 输出、路由覆盖度自检，共 200+ 项断言。',
    en: 'Five automated suites: routing and four-language rendering, recommendation-engine correctness, end-to-end business flow, SEO output, and route-coverage self-check — 200+ assertions in total.',
    ja: '5つの自動テストスイート：ルーティングと四言語描画、推薦エンジンの正しさ、業務フローの一気通貫、SEO出力、ルート網羅性の自己検査。合計200以上のアサーション。',
    ko: '5개 자동 테스트 스위트: 라우팅과 4개 언어 렌더링, 추천 엔진 정확성, 비즈니스 흐름 종단 검증, SEO 출력, 라우트 커버리지 자체 점검. 총 200개 이상의 검증.'
  },

  // ---------------- 演示路径 ----------------
  'feat.demo': { zh: '演示路径', en: 'Demo walkthrough', ja: 'デモの流れ', ko: '데모 경로' },
  'feat.demoLead': {
    zh: '建议按以下顺序演示，约 3 分钟可覆盖全部亮点。',
    en: 'Suggested demo order — about three minutes to cover every highlight.',
    ja: '以下の順序でのデモを推奨します。約3分で全てのポイントを網羅できます。',
    ko: '다음 순서로 시연하시면 약 3분 안에 모든 특징을 보여줄 수 있습니다.'
  },
  'feat.demo1': { zh: '首页：四语言切换，感受非遗视觉与品牌定位', en: 'Home: switch among four languages; note the heritage visual identity', ja: 'ホーム：四言語を切替え、無形文化遺産のビジュアルとブランド定位を確認', ko: '홈: 4개 언어 전환, 무형문화유산 비주얼과 브랜드 정체성 확인' },
  'feat.demo2': { zh: '首次进站弹窗：3 步拿到调养组合', en: 'First-visit popup: get a care bundle in three steps', ja: '初回訪問ポップアップ：3ステップで養生セットを提案', ko: '첫 방문 팝업: 3단계로 양생 조합 제안' },
  'feat.demo3': { zh: '完整 18 题测评：查看主导/兼夹体质、得分明细与调理建议', en: 'Full 18-question test: primary and secondary constitution, score breakdown, care advice', ja: '完全18問チェック：主・兼夾体質、得点明細、養生アドバイス', ko: '18문항 정밀 진단: 주·겸협 체질, 점수 상세, 관리 조언' },
  'feat.demo4': { zh: '推荐结果：匹配度、专精加权后的排序与非遗配套推荐', en: 'Results: match scores, specificity-weighted ranking, heritage companion picks', ja: '推薦結果：マッチ度、専門性加重の順位、無形文化遺産の併せ推薦', ko: '추천 결과: 매칭도, 전문성 가중 순위, 무형문화유산 동반 추천' },
  'feat.demo5': { zh: '购物闭环：加购、注册、下单、健康检查接口', en: 'Commerce loop: cart, register, order, health endpoint', ja: '購買の一連：カート、登録、注文、ヘルスチェック', ko: '구매 흐름: 장바구니, 가입, 주문, 헬스 체크' },

  'feat.startDemo': { zh: '开始体验', en: 'Start the demo', ja: 'デモを始める', ko: '데모 시작' },
  'feat.viewQuiz': { zh: '先测体质', en: 'Take the assessment', ja: '体質チェックへ', ko: '체질 진단하기' },
  'feat.viewProducts': { zh: '逛非遗好物', en: 'Browse heritage goods', ja: '逸品を見る', ko: '아이템 둘러보기' }
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
