/**
 * Locale keys for the content pages (contact / join / shipping / returns / solar terms).
 */
const fs = require('fs');
const path = require('path');
const DIR = './data/locales';

const A = {
  'contact.addressTitle': { zh: '公司地址', en: 'Office address', ja: '会社所在地', ko: '회사 주소' },
  'contact.addressValue': { zh: '中国 · 浙江杭州<br>西湖区 养生文化产业园', en: 'Hangzhou, Zhejiang, China<br>West Lake District, Wellness Culture Park', ja: '中国・浙江省杭州市<br>西湖区 養生文化産業園区', ko: '중국 저장성 항저우시<br>시후구 양생문화산업단지' },
  'contact.phoneValue': { zh: '客服：0571-12345678<br>合作：0571-87654321', en: 'Support: +86 571 1234 5678<br>Partnership: +86 571 8765 4321', ja: 'カスタマー：+86 571 1234 5678<br>提携：+86 571 8765 4321', ko: '고객센터: +86 571 1234 5678<br>제휴: +86 571 8765 4321' },
  'contact.emailValue': { zh: '客服：service@dongfangdian.com<br>合作：coop@dongfangdian.com', en: 'Support: service@dongfangdian.com<br>Partnership: coop@dongfangdian.com', ja: 'カスタマー：service@dongfangdian.com<br>提携：coop@dongfangdian.com', ko: '고객센터: service@dongfangdian.com<br>제휴: coop@dongfangdian.com' },
  'contact.serviceText': { zh: '工作日 9:00–18:00 在线，中文 / English / 日本語 / 한국어 均可沟通。', en: 'Online 9:00–18:00 on weekdays, in Chinese, English, Japanese or Korean.', ja: '平日 9:00〜18:00 対応。中国語・英語・日本語・韓国語でご相談いただけます。', ko: '평일 9:00~18:00 상담 가능하며 중국어, 영어, 일본어, 한국어 모두 지원합니다.' },
  'contact.addressText': { zh: '浙江省杭州市西湖区龙井路 1 号 东方·集成文化馆', en: 'Dongfang Jicheng Culture Hall, 1 Longjing Road, Xihu District, Hangzhou, Zhejiang', ja: '浙江省杭州市西湖区龍井路1号 東方・集成文化館', ko: '저장성 항저우시 시후구 룽징로 1호 동방·집성 문화관' },
  'contact.coopText': { zh: '如果你是非遗传承人或手作工坊，欢迎与我们共同开发养生产品线。', en: 'If you are a heritage inheritor or artisan workshop, let us develop a wellness product line together.', ja: '無形文化遺産の継承者や手仕事の工房の方、ともに養生商品ラインを開発しませんか。', ko: '무형문화유산 전승자나 수공예 공방이라면 함께 양생 상품 라인을 개발해요.' },
  'contact.formTitle': { zh: '留言反馈', en: 'Leave a message', ja: 'メッセージを送る', ko: '메시지 남기기' },
  'contact.formName': { zh: '您的姓名', en: 'Your name', ja: 'お名前', ko: '이름' },
  'contact.formEmail': { zh: '电子邮箱', en: 'Email address', ja: 'メールアドレス', ko: '이메일' },
  'contact.formMessage': { zh: '留言内容', en: 'Your message', ja: 'メッセージ内容', ko: '메시지 내용' },
  'contact.formSubmit': { zh: '提交留言', en: 'Send message', ja: '送信する', ko: '메시지 보내기' },

  'join.intro': { zh: '如果你热爱东方文化，认同我们的理念，欢迎加入东方·集成大家庭！', en: 'If you love Eastern culture and share our vision, we would love you to join the Dongfang Jicheng family.', ja: '東洋文化を愛し、私たちの理念に共感してくださる方、東方・集成の仲間になりませんか。', ko: '동양 문화를 사랑하고 우리의 이념에 공감하신다면 동방·집성 가족이 되어 주세요.' },
  'join.typeFull': { zh: '全职', en: 'Full-time', ja: '正社員', ko: '정규직' },
  'join.typeBoth': { zh: '全职/兼职', en: 'Full-time / Part-time', ja: '正社員／パート', ko: '정규직/파트타임' },
  'join.location': { zh: '杭州 · 薪资面议', en: 'Hangzhou · Salary negotiable', ja: '杭州・給与は応相談', ko: '항저우 · 급여 협의' },
  'join.j1Title': { zh: '非遗文化研究员', en: 'Heritage Culture Researcher', ja: '無形文化遺産リサーチャー', ko: '무형문화유산 연구원' },
  'join.j1Text': { zh: '负责非遗文化资料的收集、整理和研究，撰写科普文章。', en: 'Collect, organise and research heritage-culture material, and write popular-science articles.', ja: '無形文化遺産に関する資料の収集・整理・研究、啓蒙記事の執筆を担当。', ko: '무형문화유산 자료 수집과 정리, 연구, 대중 교양 글 집필을 담당합니다.' },
  'join.j2Title': { zh: '电商运营专员', en: 'E-commerce Operations Specialist', ja: 'EC運営担当', ko: '이커머스 운영 담당' },
  'join.j2Text': { zh: '负责平台日常运营，商品上下架，活动策划。', en: 'Run day-to-day platform operations, product listings, and campaign planning.', ja: 'プラットフォームの日常運営、商品の登録・更新、キャンペーン企画を担当。', ko: '플랫폼 일상 운영과 상품 등록, 프로모션 기획을 담당합니다.' },
  'join.j3Title': { zh: '汉服设计师', en: 'Hanfu Designer', ja: '漢服デザイナー', ko: '한푸 디자이너' },
  'join.j3Text': { zh: '负责汉服款式设计，熟悉传统形制和现代审美。', en: 'Design hanfu styles, with a feel for traditional form and modern taste.', ja: '漢服のデザインを担当。伝統的な形制と現代の美意識に通じている方。', ko: '한푸 디자인을 담당하며 전통 형식과 현대적 미감을 이해하고 있어야 합니다.' },
  'join.j4Title': { zh: '摄影师 / 视频剪辑', en: 'Photographer / Video Editor', ja: 'フォトグラファー／動画編集', ko: '포토그래퍼 / 영상 편집' },
  'join.j4Text': { zh: '负责产品拍摄、短视频制作，用于电商平台和社交媒体。', en: 'Shoot products and produce short videos for the shop and social media.', ja: '商品撮影とショート動画制作を担当し、ECとSNSで展開。', ko: '상품 촬영과 숏폼 영상 제작을 담당해 커머스와 SNS에 활용합니다.' },
  'join.applyTitle': { zh: '请将简历发送至：hr@dongfangdian.com', en: 'Send your CV to: hr@dongfangdian.com', ja: '履歴書の送付先：hr@dongfangdian.com', ko: '이력서 보내실 곳: hr@dongfangdian.com' },
  'join.applyHint': { zh: '邮件标题格式：姓名 + 应聘职位', en: 'Email subject: your name + the role you are applying for', ja: 'メール件名：お名前＋応募職種', ko: '메일 제목: 이름 + 지원 직무' },

  'shipping.introTitle': { zh: '🌍 全球配送', en: '🌍 Worldwide shipping', ja: '🌍 世界配送', ko: '🌍 전 세계 배송' },
  'shipping.lead': { zh: '非遗手作与本草好物，从杭州发往世界各地。', en: 'Handmade heritage goods and herbal wellness, shipped from Hangzhou to the world.', ja: '無形文化遺産の手仕事と本草の逸品を、杭州から世界へお届けします。', ko: '무형문화유산 수공예품과 본초 아이템을 항저우에서 전 세계로 보내드립니다.' },
  'returns.lead': { zh: '七天内无理由退换，让每一次选购都安心。', en: 'Seven-day no-reason returns, so every purchase feels safe.', ja: '7日間の無理由返品交換で、安心してお買い物を。', ko: '7일 무조건 반품·교환으로 언제나 안심하고 구매하세요.' },
  'shipping.introText': { zh: '我们支持全球配送！无论您身在何处，都能将东方养生智慧送到您手中。', en: 'We ship worldwide — wherever you are, Eastern wellness wisdom can reach you.', ja: '世界中へお届けします。どこにいても東洋の養生の知恵をお手元に。', ko: '전 세계로 배송합니다. 어디에 계시든 동양 양생의 지혜를 받아보세요.' },
  'shipping.timeTitle': { zh: '⏱️ 配送时效', en: '⏱️ Delivery time', ja: '⏱️ 配送日数', ko: '⏱️ 배송 소요 시간' },
  'shipping.timeText': { zh: '中国大陆：3-5 个工作日<br>亚洲地区：5-10 个工作日<br>欧美及其他地区：10-15 个工作日', en: 'Mainland China: 3–5 business days<br>Asia: 5–10 business days<br>Europe, America and elsewhere: 10–15 business days', ja: '中国本土：3〜5営業日<br>アジア：5〜10営業日<br>欧米その他：10〜15営業日', ko: '중국 본토: 영업일 3~5일<br>아시아: 영업일 5~10일<br>유럽·미주 및 기타: 영업일 10~15일' },
  'shipping.trackTitle': { zh: '📦 物流查询', en: '📦 Tracking', ja: '📦 配送状況の確認', ko: '📦 배송 조회' },
  'shipping.trackText': { zh: '发货后您会收到邮件通知，包含物流单号和查询链接。也可在「我的订单」中实时追踪。', en: 'You will receive an email with the tracking number and link once shipped. You can also track it in real time under “My orders”.', ja: '発送後に追跡番号とリンクをメールでお知らせします。「マイ注文」からもリアルタイムで追跡できます。', ko: '발송 후 운송장 번호와 조회 링크를 이메일로 보내드립니다. 「내 주문」에서도 실시간으로 확인할 수 있습니다.' },
  'shipping.feeTitle': { zh: '💰 运费政策', en: '💰 Shipping fees', ja: '💰 送料について', ko: '💰 배송비 정책' },
  'shipping.feeText': { zh: '中国大陆：免运费<br>国际订单：根据地区自动计算运费，单笔满 $100 免国际运费', en: 'Mainland China: free shipping<br>International: calculated automatically by region; free over US$100 per order', ja: '中国本土：送料無料<br>国際便：地域ごとに自動計算。1回のご注文が100米ドル以上で国際送料無料', ko: '중국 본토: 무료 배송<br>국제 주문: 지역별 자동 계산, 주문 금액 100달러 이상 시 국제 배송비 무료' },
  'shipping.partnerText': { zh: '🌟 我们与 DHL、FedEx、顺丰国际等优质物流商合作，确保您的包裹安全、准时送达。', en: '🌟 We work with DHL, FedEx, SF International and other premium carriers to get your parcel there safely and on time.', ja: '🌟 DHL、FedEx、SFインターナショナルなど優良な物流会社と提携し、荷物を安全・定時に届けます。', ko: '🌟 DHL, FedEx, SF 인터내셔널 등 우수 물류사와 협력해 소포를 안전하고 정시에 전달합니다.' },

  'returns.r1Title': { zh: '✅ 七天无理由退换', en: '✅ 7-day no-reason returns', ja: '✅ 7日間返品交換保証', ko: '✅ 7일 무조건 반품·교환' },
  'returns.r1Text': { zh: '收到商品后 7 天内，如商品完好、不影响二次销售，可申请无理由退换。', en: 'Within 7 days of delivery, request a return or exchange as long as the item is intact and resaleable.', ja: '商品到着後7日以内、商品が完好で再販売可能な場合、理由を問わず返品交換を承ります。', ko: '상품 수령 후 7일 이내에 상품이 온전하고 재판매가 가능하면 사유 없이 반품·교환을 신청할 수 있습니다.' },
  'returns.r2Title': { zh: '⚠️ 质量问题退换', en: '⚠️ Returns for quality issues', ja: '⚠️ 品質問題の返品交換', ko: '⚠️ 품질 문제 반품·교환' },
  'returns.r2Text': { zh: '如商品存在质量问题，请拍照联系客服，我们将为您免费退换。', en: 'If there is a quality problem, send photos to our support team and we will replace or refund it free of charge.', ja: '品質に問題がある場合は写真を添えてカスタマーまでご連絡ください。無償で交換・返金いたします。', ko: '품질 문제가 있으면 사진을 찍어 고객센터에 연락해 주세요. 무료로 교환 또는 환불해 드립니다.' },
  'returns.r3Title': { zh: '📞 客服联系', en: '📞 Contact support', ja: '📞 お問い合わせ', ko: '📞 고객센터 연락' },
  'returns.r4Title': { zh: '📝 退换流程', en: '📝 Return process', ja: '📝 返品の流れ', ko: '📝 반품 절차' },
  'returns.r4Text': { zh: '联系客服 → 确认退换 → 寄回商品 → 验收退款/换货', en: 'Contact support → confirm the return → ship the item back → refund or exchange after inspection', ja: 'カスタマー連絡 → 返品確認 → 商品を返送 → 検品後に返金／交換', ko: '고객센터 연락 → 반품 확인 → 상품 반송 → 검수 후 환불/교환' },

  'solar.title': { zh: '二十四节气养生', en: 'Wellness by the 24 Solar Terms', ja: '二十四節気の養生', ko: '24절기 양생' },
  'solar.lead': { zh: '一年二十四个节气，各有各的养护重点。顺着天时调养，事半功倍。', en: 'Each of the year’s 24 solar terms has its own focus for care. Follow nature’s timing and wellness comes twice as easily.', ja: '一年の二十四節気、それぞれに養生の重点があります。天の巡りに沿えば、養生はより実を結びます。', ko: '한 해 24절기마다 관리의 중점이 다릅니다. 하늘의 흐름에 맞추면 양생이 훨씬 수월해집니다.' },
  'solar.current': { zh: '当前节气', en: 'Current term', ja: '現在の節気', ko: '현재 절기' },
  'solar.next': { zh: '下一个节气', en: 'Next term', ja: '次の節気', ko: '다음 절기' },
  'home.EntryBtnPrompt': { zh: '测体质', en: 'Take the test', ja: '体質テスト', ko: '체질 테스트' },
  'solar.quizPrompt': { zh: '顺着节气调养，也顺着体质调养', en: 'Care for yourself by the season — and by your constitution', ja: '季節に沿って、そして体質に沿って養生を', ko: '절기에 맞추고, 체질에 맞춰 관리하세요' }
};

for (const lang of ['zh', 'en', 'ja', 'ko']) {
  const file = path.join(DIR, `${lang}.json`);
  const table = JSON.parse(fs.readFileSync(file, 'utf8'));
  let added = 0;
  for (const [key, values] of Object.entries(A)) {
    if (!(key in table)) { table[key] = values[lang]; added++; }
  }
  fs.writeFileSync(file, JSON.stringify(table, null, 2) + '\n', 'utf8');
  console.log(`${lang}.json: +${added}, total ${Object.keys(table).length}`);
}

const keys = (l) => Object.keys(JSON.parse(fs.readFileSync(path.join(DIR, `${l}.json`), 'utf8'))).sort();
const zh = keys('zh');
for (const l of ['en', 'ja', 'ko']) {
  const k = keys(l);
  console.log(`${l}: missing ${zh.filter(x => !k.includes(x)).length}, extra ${k.filter(x => !zh.includes(x)).length}`);
}
