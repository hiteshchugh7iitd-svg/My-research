/**
 * Japanese translations, keyed by the exact English text shown on the site.
 *
 * - Interface text (buttons, headings, labels) and the default page content are translated here.
 * - Anything an administrator types in the “(日本語)” fields of the admin console always wins over
 *   this dictionary.
 * - Text that has no translation is shown as written (English), so nothing ever goes missing.
 *
 * Translations are a first draft and should be proofread by a native speaker.
 */
const D: Record<string, string> = {
  // ---------- Layout ----------
  'Kobe University · Graduate School of International Cooperation Studies · Cross-appointed IRIDeS, Tohoku University':
    '神戸大学大学院国際協力研究科 ・ 東北大学災害科学国際研究所（クロスアポイントメント）',
  Address: '所在地',
  'E-mail:': 'メール：',
  'Tel:': '電話：',
  'The seminar': 'ゼミについて',
  'Research themes & projects': '研究テーマ・プロジェクト',
  'Teaching & joining the seminar': '教育・ゼミへの参加',
  'Student activities': 'ゼミ生の活動',
  'Upcoming events': '今後のイベント',
  'No events scheduled.': '予定されているイベントはありません。',
  Website: 'ウェブサイト',
  'Members area': 'メンバー専用ページ',
  'Member sign-in': 'メンバーログイン',
  '☰ Menu': '☰ メニュー',
  'Skip to content': '本文へ移動',
  'Search the site': 'サイト内検索',

  // ---------- Home ----------
  'Join the seminar': 'ゼミに参加する',
  'Research themes': '研究テーマ',
  'Read more': '続きを読む',
  'Forthcoming events': '今後のイベント',
  'Message from the professor': '教授からのメッセージ',
  Alumni: '修了生',
  'Recent news': '最新ニュース',
  'All news': 'ニュース一覧',
  'Between policy and the classroom': '政策と教室のあいだで',
  'At a glance': '数字で見る',
  Papers: '論文',
  Talks: '講演・発表',
  'Funded projects': '研究プロジェクト',
  Students: 'ゼミ生',
  'Recent papers': '最近の論文',
  'All publications →': '業績一覧 →',
  'News and student reports will appear here once they are published from the admin console.': 'ニュースやゼミ生の報告は、公開されるとここに表示されます。',

  // ---------- Professor ----------
  Profile: 'プロフィール',
  'Message to students': '学生へのメッセージ',
  'Research areas': '研究分野',
  Education: '学歴',
  Career: '経歴',
  Awards: '受賞',
  'Awards are listed here once added in the admin console.': '受賞歴は、登録されるとここに表示されます。',

  // ---------- Research ----------
  Research: '研究',
  'Research themes and projects': '研究テーマとプロジェクト',
  'How schools and the communities around them prepare for, survive and recover from disaster — studied in the field, with partners, across Asia and beyond.':
    '学校と周辺地域が災害にどう備え、乗り越え、復興するのか。アジアをはじめ各地の現場で、パートナーとともに研究しています。',
  'Representative work:': '代表的な業績：',
  'Where we work': '調査地',
  'Funded research projects': '研究助成プロジェクト',
  Ongoing: '実施中',
  Completed: '終了',
  'Projects appear here once added in the admin console.': 'プロジェクトは、登録されるとここに表示されます。',
  'Principal Investigator': '研究代表者',
  'Co-investigator': '研究分担者',
  Collaborator: '連携研究者',

  // ---------- Publications ----------
  Publications: '業績',
  'Complete list of works': '業績一覧',
  'Papers, books and chapters, reports and proceedings, and invited talks by Prof. Sakurai and seminar members. Records follow Prof. Sakurai’s researchmap profile.':
    '桜井教授とゼミ生による論文、書籍・章、報告書・会議録、招待講演の一覧です。記録は桜井教授のresearchmapのプロフィールに基づきます。',
  'Books & chapters': '書籍・章',
  'Reports & proceedings': '報告書・会議録',
  'Talks & presentations': '講演・発表',
  'Peer-reviewed': '査読あり',
  All: 'すべて',
  'Peer-reviewed only': '査読ありのみ',
  'All years': 'すべての年',
  'Search title, venue, author…': 'タイトル・掲載先・著者で検索…',
  records: '件',
  Paper: '論文',
  'Book / chapter': '書籍・章',
  Report: '報告書',
  Talk: '講演・発表',
  Invited: '招待',

  // ---------- Members / Alumni ----------
  'Seminar members': 'ゼミ生',
  'Doctoral, master’s and research students working on disaster education, school safety and resilience. Each member keeps their own profile up to date.':
    '防災教育、学校安全、レジリエンスを研究する博士・修士・研究生です。各自が自分のプロフィールを更新しています。',
  'Member profiles for the current academic year are being added.': '今年度のメンバーのプロフィールを順次掲載します。',
  Entered: '入学',
  'Doctoral (PhD)': '博士後期課程',
  "Master's": '修士課程',
  'Research student': '研究生',
  'Exchange student': '交換留学生',
  Undergraduate: '学部生',
  'Postdoctoral researcher': '博士研究員',
  'Visiting researcher': '客員研究員',
  Current: '在籍',
  'On leave': '休学中',
  'Graduates of the seminar now working in ministries, international organisations, NGOs, universities and schools around the world.':
    '省庁、国際機関、NGO、大学、学校など世界各地で活躍するゼミの修了生です。',
  Name: '氏名',
  Programme: '課程',
  Thesis: '論文題目',
  Now: '現在',
  Earlier: 'それ以前',
  'Class of': '修了年：',
  'Alumni are listed here when a student’s status is changed to “Alumni” in the admin console.': '在籍状況が「修了生」になると、ここに表示されます。',
  'Member not found': 'メンバーが見つかりません',
  'Back to students': 'ゼミ生一覧へ戻る',
  Status: '在籍状況',
  'Year of entry': '入学年',
  'Country / region': '国・地域',
  'Research topic': '研究テーマ',
  'Current position': '現職',
  Interests: '関心分野',
  Contact: '連絡先',
  Documents: '資料',
  'CV (PDF)': '履歴書・CV（PDF）',
  Activities: '活動',

  // ---------- News ----------
  'News & Events': 'ニュース・イベント',
  'News & events': 'ニュース・イベント',
  'Seminar news, events, fieldwork, internships and conference reports — many written by students themselves.':
    'ゼミのニュース、イベント、フィールドワーク、インターンシップ、学会報告など。多くはゼミ生自身が執筆しています。',
  Categories: 'カテゴリー',
  'Recent posts': '最近の投稿',
  Archives: 'アーカイブ',
  'No posts in this category yet.': 'このカテゴリーの投稿はまだありません。',
  'Post not found': '投稿が見つかりません',
  'Back to news': 'ニュースへ戻る',
  Photos: '写真',
  'Event date': 'イベント日',
  by: '執筆：',
  News: 'ニュース',
  Event: 'イベント',
  Internship: 'インターンシップ',
  Fieldwork: 'フィールドワーク',
  Conference: '学会・会議',
  Award: '受賞',
  Seminar: 'ゼミ',
  'Student activity': 'ゼミ生の活動',
  Members: 'メンバー',
  'New publication': '新刊・新着論文',

  // ---------- Gallery ----------
  Gallery: 'ギャラリー',
  'Seminar life, fieldwork, internships and conferences, organised by academic year (April–March).':
    'ゼミの日常、フィールドワーク、インターンシップ、学会の様子を、学年（4月〜3月）ごとにまとめています。',
  'Albums appear here once photos are uploaded in the admin console.': 'アルバムは、写真が登録されるとここに表示されます。',
  photos: '枚',
  'Album not found': 'アルバムが見つかりません',
  'Back to gallery': 'ギャラリーへ戻る',
  'No photos yet.': '写真はまだありません。',
  Other: 'その他',

  // ---------- Visitors / Teaching / Contact / Search / Login ----------
  Visitors: '来訪者',
  'Visitors to the seminar': 'ゼミへの来訪者',
  'Scholars, practitioners and policymakers who have visited the seminar to give lectures, join workshops and meet students.':
    '講義やワークショップ、学生との交流のためにゼミを訪れた研究者、実務家、政策担当者の方々です。',
  'The list of visitors is maintained in the admin console.': '来訪者の一覧は管理画面で更新されます。',
  Teaching: '教育',
  'Courses & joining the seminar': '授業とゼミへの参加',
  'Graduate teaching at Kobe University GSICS, with cross-appointments and guest teaching at Tohoku University, Toyo Eiwa University and partner institutions in Asia and Europe.':
    '神戸大学国際協力研究科での大学院教育に加え、東北大学、東洋英和女学院大学、アジア・ヨーロッパの提携機関でも教育に携わっています。',
  'Courses and supervision': '授業と指導',
  'What seminar life looks like': 'ゼミの日常',
  'Why join our seminar': 'ゼミに参加する理由',
  'How to apply →': '応募方法 →',
  'Aiko Sakurai Seminar': '桜井愛子ゼミ',
  Telephone: '電話',
  Office: '研究室',
  'Open in Google Maps ↗': 'Googleマップで開く ↗',
  'Prospective students': '入学を希望する方へ',
  'Write to Prof. Sakurai': '桜井教授にメールする',
  'Partners and links': '提携機関・リンク',
  Search: '検索',
  'Results for': '検索結果：',
  results: '件',
  Member: 'メンバー',
  Album: 'アルバム',
  Publication: '業績',
  'Sign in': 'ログイン',
  'For seminar students, alumni and staff. Accounts are issued by Prof. Sakurai or a seminar administrator.':
    'ゼミ生、修了生、スタッフ向けです。アカウントは桜井教授またはゼミの管理者が発行します。',
  'First time? Use the email address and temporary password from your invitation email — you will be asked to choose your own password.':
    '初めての方は、招待メールに記載のメールアドレスと仮パスワードを使ってください。ご自身のパスワードを設定する画面が表示されます。',
  'Lost access? Write to': 'ログインできない場合は、こちらへご連絡ください：',
  'Page not found': 'ページが見つかりません',
  'The page you are looking for has moved or does not exist.': 'お探しのページは移動したか、存在しません。',
  'Something went wrong': '問題が発生しました',

  // ---------- Content: site ----------
  'Disaster Education · School Safety · Resilience': '防災教育・学校安全・レジリエンス',
  'Grounded Thinking for a Better Planet': '現場に根ざした思考で、よりよい地球を',
  'Research and graduate teaching on how schools and the communities around them prepare for, survive and recover from disaster — from Ishinomaki and Kobe to Banda Aceh, Tacloban and Kahramanmaraş.':
    '学校と周辺地域が災害にどう備え、乗り越え、復興するのか。石巻や神戸から、バンダ・アチェ、タクロバン、カフラマンマラシュまで、研究と大学院教育に取り組んでいます。',
  'Graduate School of International Cooperation Studies (GSICS), Kobe University': '神戸大学大学院国際協力研究科',
  'Seminar members, Kobe University Rokkodai campus': 'ゼミのメンバー（神戸大学六甲台キャンパス）',
  'Study visit to IRIDeS, Tohoku University, Sendai': '東北大学災害科学国際研究所（仙台）での研修訪問',
  'Global Challenge of Disaster Reduction, graduate course': '大学院科目「災害減災のグローバル・チャレンジ」',
  'Coastal fieldwork — seawall and fishing port': '沿岸部でのフィールドワーク ― 防潮堤と漁港',
  'Seminar members, Kobe University GSICS': 'ゼミのメンバー（神戸大学国際協力研究科）',

  // ---------- Content: professor ----------
  'Professor, Graduate School of International Cooperation Studies, Kobe University': '神戸大学大学院国際協力研究科 教授',
  'Cross-appointed Professor, International Research Institute of Disaster Science (IRIDeS), Tohoku University':
    '東北大学災害科学国際研究所 教授（クロスアポイントメント）',
  'With extensive experience in international development, disaster risk reduction and global education initiatives, Prof. Sakurai brings a blend of practical expertise and academic insight to her research and teaching. Her professional path runs through the World Bank, international NGOs including Save the Children, and development consulting.':
    '桜井教授は、国際開発、災害リスク削減、グローバルな教育協力の分野で豊富な経験を持ち、実務的な専門性と学術的な洞察を研究と教育に生かしています。世界銀行、セーブ・ザ・チルドレンをはじめとする国際NGO、開発コンサルティングを経て、現職に至ります。',
  'Since moving to academia she has worked on disaster-resilient education systems and school–community collaboration in Japan and abroad, with an emphasis on interdisciplinary work that combines social science, engineering and environmental science.':
    '研究者となってからは、日本国内外で、災害に強い教育システムや学校と地域の連携に取り組み、社会科学・工学・環境科学を組み合わせた学際的な研究を重視しています。',
  'Prof. Sakurai came to the university after fifteen years in practice — the World Bank, Keidanren, the Cabinet Secretariat, development consulting, and Save the Children’s Tohoku recovery programme. That history shapes how the seminar works: research questions come from the field, and findings are meant to land in ministries, prefectural boards and staff rooms.':
    '桜井教授は、世界銀行、経団連、内閣官房、開発コンサルティング、セーブ・ザ・チルドレンの東北復興支援など、15年にわたる実務を経て大学に移りました。この経歴はゼミの進め方にも表れています。研究の問いは現場から生まれ、成果は省庁、教育委員会、学校の職員室に届けることを目指しています。',
  'Students work at the intersection of education, disaster management and sustainable development, combining social science with engineering and environmental science.':
    'ゼミ生は、教育、防災・災害対応、持続可能な開発が交わる領域で、社会科学と工学・環境科学を組み合わせて研究しています。',
  'Sociology of Education — international educational development, school safety and disaster education.': '教育社会学 ― 国際教育開発、学校安全、防災教育',
  'Disaster Prevention Engineering — social infrastructure.': '防災工学 ― 社会基盤',
  'disaster education · school disaster resilience · capacity development for DRR · school–community partnerships · school management improvement · girls’ education · training development and evaluation':
    '防災教育・学校の災害レジリエンス・防災のための能力開発・学校と地域の連携・学校運営の改善・女子教育・研修の開発と評価',

  // ---------- Content: contact ----------
  'Graduate School of International Cooperation Studies, Kobe University\n2-1 Rokkodai-cho, Nada-ku, Kobe 657-8501, Japan':
    '神戸大学大学院国際協力研究科\n〒657-8501 兵庫県神戸市灘区六甲台町2-1',
  'Prospective students are welcome to write to Prof. Sakurai with a short research plan (one page), a CV and their intended programme (Master’s or PhD). Applications to GSICS are made through the university’s admissions process; please check the GSICS website for current deadlines.':
    '入学を希望される方は、研究計画（1ページ程度）、履歴書、希望する課程（修士または博士）を添えて、桜井教授にご連絡ください。大学院への出願は大学の入試手続きを通じて行います。最新の締切は国際協力研究科のウェブサイトでご確認ください。',

  // ---------- Content: career ----------
  'Kobe University': '神戸大学',
  'Toyo Eiwa University': '東洋英和女学院大学',
  'Tohoku University': '東北大学',
  'Tokyo Medical University': '東京医科大学',
  'Osaka University': '大阪大学',
  'Save the Children Japan': 'セーブ・ザ・チルドレン・ジャパン',
  'Cabinet Secretariat, Government of Japan': '内閣官房',
  'PADECO Co., Ltd.': '株式会社パデコ',
  'Fleishman Hillard Japan': 'フライシュマン・ヒラード・ジャパン',
  'World Bank (IBRD), USA': '世界銀行（米国）',
  'Keidanren (Japan Business Federation)': '経団連（日本経済団体連合会）',
  'Columbia University, USA': 'コロンビア大学（米国）',
  'Keio University': '慶應義塾大学',
  'Professor, Graduate School of International Cooperation Studies (GSICS)': '国際協力研究科 教授',
  'Visiting Professor, Graduate School of International Cooperation': '大学院国際協力研究科 客員教授',
  'Professor (cross-appointment), International Research Institute of Disaster Science (IRIDeS)': '災害科学国際研究所 教授（クロスアポイントメント）',
  'Part-time Lecturer, Development Operations and Evaluation': '非常勤講師（開発オペレーションと評価）',
  'Part-time Lecturer, Disaster Education, School of Nursing': '非常勤講師（看護学部・防災教育）',
  'Professor, Graduate School of International Cooperation / Faculty of Social Sciences': '大学院国際協力研究科・社会科学部 教授',
  'Associate Professor, Graduate School of International Cooperation': '大学院国際協力研究科 准教授',
  'Associate Professor, IRIDeS': '災害科学国際研究所 准教授',
  'Specially Appointed Associate Professor, GSICS': '国際協力研究科 特命准教授',
  'Part-time Lecturer, Center for Japanese Language and Culture': '非常勤講師（日本語日本文化教育センター）',
  'Education Sector Manager, Great East Japan Earthquake Recovery Support Division': '教育セクター・マネージャー（東日本大震災復興支援事業部）',
  'Administrative Official, General Affairs Office': '行政官（総務室）',
  'Deputy Director, Consulting Division / Overseas Business Promotion': 'コンサルティング部 副部長／海外事業推進',
  'Managing Supervisor, communications consulting': 'マネージング・スーパーバイザー（コミュニケーション・コンサルティング）',
  'Partnership Specialist, Vice Presidency for Private Sector Development and Infrastructure': 'パートナーシップ・スペシャリスト（民間セクター開発・インフラ担当副総裁室）',
  'Planning and Research Staff, Economic Cooperation Division': '企画・調査スタッフ（経済協力部）',
  'Ph.D., Graduate School of International Cooperation Studies (Regional Cooperation Policy)': '博士（国際協力研究科・地域協力政策）',
  'Master of Public Administration, School of International and Public Affairs (SIPA)': '公共経営修士（国際公共政策大学院 SIPA）',
  'Master\'s degree, Graduate School of Law (Political Science)': '修士（法学研究科・政治学）',
  'LL.B., Faculty of Law, Department of Political Science': '学士（法学部政治学科）',

  // ---------- Content: research themes ----------
  'School Disaster Safety and Preparedness': '学校防災と備え',
  'Disaster Education and Risk Communication': '防災教育とリスクコミュニケーション',
  'Post-Disaster Educational Recovery': '災害後の教育復興',
  'School–Community Partnerships and Memory': '学校と地域の連携、そして記憶',
  'How schools translate hazard information into workable evacuation plans, and what keeps those plans alive year after year. Recent work operationalises updated tsunami hazard assumptions in school evacuation planning and builds assessment methods for wind and water disasters.':
    '学校がハザード情報を実行可能な避難計画に落とし込む方法と、その計画を毎年生きたものにしておく仕組みを研究しています。最近は、更新された津波想定を学校の避難計画に反映する取り組みや、風水害の評価手法の開発に取り組んでいます。',
  'Teacher training, geomorphology and map literacy, and Web GIS tools that let school staff read local risk. The seminar develops and evaluates in-service training programmes, then measures what changes in schools afterwards.':
    '教員研修、地形学と地図の読み取り、学校の教職員が地域のリスクを読み解くためのWeb GISなどを扱います。現職教員向けの研修プログラムを開発・評価し、その後学校に何が変わったかを測定します。',
  'What happens to schooling after the event — reopening timelines, the tension between school buildings and evacuation shelters, and the role of external support. Fieldwork spans the 2024 Noto Peninsula earthquake, the 2023 Kahramanmaraş earthquakes and post-Yolanda Tacloban.':
    '災害後の学校教育に何が起きるのか。学校再開までの経過、校舎と避難所の両立の難しさ、外部支援の役割を扱います。2024年能登半島地震、2023年カフラマンマラシュ地震、台風ヨランダ後のタクロバンなどで調査を行っています。',
  'Schools as community assets: place-making in resettlement, community-school disaster models, and how disaster memory is transmitted across generations. Includes comparative work on memory sites in Japan, Türkiye and the Philippines, and on women’s leadership in tsunami-affected communities.':
    '地域の資産としての学校。移転再定住地での場づくり、学校と地域による防災モデル、災害の記憶の世代間継承を扱います。日本、トルコ、フィリピンの記憶の場の比較研究や、津波被災地域における女性のリーダーシップの研究も含みます。',
  'Operationalizing Updated Tsunami Hazard Assumptions in School Evacuation Planning (JDR, 2026); Exploring minimum essentials for sustainable school disaster preparedness, Banda Aceh (IJDRR, 2018).':
    '「更新された津波想定の学校避難計画への反映」（JDR、2026年）、「持続可能な学校防災の最低限の要素の探究：バンダ・アチェ」（IJDRR、2018年）',
  'Impact evaluation of a school-based disaster education program in a city affected by the 2011 Great East Japan Earthquake (IJDRR, 2020); Three-Steps Hazard Map Reading Method Based on Landform (2024).':
    '「東日本大震災の被災都市における学校防災教育プログラムの影響評価」（IJDRR、2020年）、「地形に基づく3ステップのハザードマップ読図法」（2024年）',
  'Challenges and Potentials for "Supporting Supporters" on Education, 2024 Noto Peninsula Earthquake (JDR, 2024); Linking Housing and School Recovery Post-Disaster: Tacloban After Typhoon Yolanda (2016).':
    '「教育における『支援者支援』の課題と可能性：2024年能登半島地震」（JDR、2024年）、「災害後の住宅と学校の復興の連携：台風ヨランダ後のタクロバン」（2016年）',
  'Schools as Community Assets for Place-making in Post-disaster Resettlement (Routledge, 2023); A Structured Analysis of Disaster Memory Inheritance through the Lens of the Kobe Model (2025).':
    '「災害後の移転再定住における場づくりの地域資産としての学校」（Routledge、2023年）、「神戸モデルから見る災害記憶継承の構造的分析」（2025年）',

  // ---------- Content: field sites ----------
  Japan: '日本',
  Indonesia: 'インドネシア',
  Philippines: 'フィリピン',
  Vietnam: 'ベトナム',
  Nepal: 'ネパール',
  'Türkiye': 'トルコ',
  Bhutan: 'ブータン',
  Taiwan: '台湾',
  'Ishinomaki · Tohoku · Kobe · Noto': '石巻・東北・神戸・能登',
  'Banda Aceh — two decades after the Indian Ocean tsunami': 'バンダ・アチェ ― インド洋津波から20年',
  'Tacloban — post-Yolanda resettlement and school recovery': 'タクロバン ― 台風ヨランダ後の移転再定住と学校の復興',
  'Comprehensive school safety, policy to practice': '包括的学校安全 ― 政策から実践まで',
  'Housing and education recovery assessment': '住宅と教育の復興の評価',
  'Kahramanmaraş earthquakes — schools and children': 'カフラマンマラシュ地震 ― 学校と子どもたち',
  'School disaster safety': '学校防災',
  'Disaster education exchange and training': '防災教育の交流と研修',

  // ---------- Content: courses ----------
  "Master's seminar": '修士ゼミ',
  "Master's / Doctoral": '修士・博士',
  Methods: '研究方法',
  Doctoral: '博士',
  Evaluation: '評価',
  'Guest teaching': '客員講義',
  'Disaster Risk Reduction and Education': '防災と教育',
  'International Educational Development': '国際教育開発',
  'Field Research Methods': 'フィールド調査法',
  'Advanced Research Seminar': '上級研究ゼミ',
  'Development Operations and Evaluation': '開発オペレーションと評価',
  'Disaster Education for Health Professions': '医療専門職のための防災教育',
  'Core seminar on comprehensive school safety, the Sendai Framework, and how disaster education is designed, delivered and evaluated.':
    '包括的学校安全、仙台防災枠組、防災教育の設計・実施・評価を学ぶ中心的なゼミです。',
  'Education policy, finance and administration in developing contexts, including SDG 4 and the politics of reform.':
    '開発途上の文脈における教育政策・財政・行政を、SDG4や改革の政治過程を含めて学びます。',
  'Qualitative and mixed methods for fieldwork in disaster-affected and hazard-prone areas — interviewing, mapping, ethics and safety.':
    '被災地やハザードの多い地域でのフィールドワークのための質的・混合研究法。インタビュー、地図化、倫理、安全管理を扱います。',
  'Dissertation supervision: research design, international publication and conference presentation.':
    '学位論文の指導。研究デザイン、国際的な論文発表、学会発表を扱います。',
  'Programme logic, monitoring and impact evaluation for development and DRR interventions.':
    '開発・防災の介入における、プログラム論理、モニタリング、インパクト評価を扱います。',
  'Delivered at Tokyo Medical University School of Nursing — disaster preparedness for clinical and community settings.':
    '東京医科大学看護学部で実施。臨床・地域の現場における災害への備えを扱います。',

  // ---------- Content: seminar life / join ----------
  'Fieldwork first': 'まずは現場から',
  'Real partners': '本物のパートナー',
  'Interdisciplinary analysis': '学際的な分析',
  'Aligned with the SDGs': 'SDGsとの連動',
  'Hands-on research in disaster-affected regions and hazard areas, with partner schools and local authorities.':
    '被災地やハザードの多い地域で、連携校や自治体とともに実地の研究を行います。',
  'Collaboration with global organisations — UN agencies, the World Bank, JICA, SEEDS Asia, Save the Children — and with local communities.':
    '国連機関、世界銀行、JICA、シーズ・アジア、セーブ・ザ・チルドレンなどの国際機関や、地域の人々と協働します。',
  'Education, disaster management and sustainable development studied together rather than in sequence.':
    '教育、防災・災害対応、持続可能な開発を、別々にではなく一体として学びます。',
  'Work connects to Goal 4 (Quality Education), Goal 11 (Sustainable Cities) and Goal 13 (Climate Action).':
    '研究は、目標4（質の高い教育）、目標11（住み続けられるまちづくり）、目標13（気候変動対策）につながっています。',
  'Engage in hands-on research': '実地の研究に取り組む',
  'Collaborate globally': '世界と協働する',
  'Develop interdisciplinary skills': '学際的な力を身につける',
  'Contribute to the SDGs': 'SDGsに貢献する',
  'Students carry out fieldwork in disaster-affected regions and hazard-prone areas, working directly with schools, teachers and local government.':
    '学生は被災地やハザードの多い地域でフィールドワークを行い、学校、教員、自治体と直接協力します。',
  'Work alongside international organisations and local communities to build resilient education systems across Asia and beyond.':
    '国際機関や地域の人々と協力し、アジアをはじめ各地で、災害に強い教育システムづくりに取り組みます。',
  'Tackle challenges at the intersection of education, disaster management and sustainable development.':
    '教育、防災・災害対応、持続可能な開発が交わる領域の課題に取り組みます。',
  'Research aligned with Goals 4, 11 and 13 — quality education, sustainable cities and climate action.':
    '目標4・11・13（質の高い教育、住み続けられるまちづくり、気候変動対策）に沿った研究を行います。',

  // ---------- Content: links ----------
  'Lab site (Kobe U)': '研究室サイト（神戸大学）',
  'IRIDeS profile': 'IRIDeS プロフィール',
  'GSICS, Kobe University': '神戸大学 国際協力研究科',
  'IRIDeS Disaster Education Lab': 'IRIDeS 防災教育ラボ',
  'Collaborative Center for Disaster Education': '防災教育協働センター',

  'Seminar schedule': 'ゼミの日程',
  'Reading list': '文献リスト',
  'Fieldwork handbook': 'フィールドワーク・ハンドブック',
  Templates: 'テンプレート',
  'Weekly meeting times, presentation rota and submission deadlines.': '毎週のゼミの時間、発表の担当、提出期限。',
  'Core texts on comprehensive school safety, DRR education and field methods.': '包括的学校安全、防災教育、フィールド調査法に関する基本文献。',
  'Ethics protocol, safety briefing and data-handling guidance for overseas research.': '海外調査のための倫理規程、安全講習、データ取り扱いの指針。',
  'Proposal, progress report and conference abstract templates used by the seminar.': 'ゼミで使う研究計画書、進捗報告、学会要旨のテンプレート。',

  // ---------- Content: projects & awards ----------
  'JSPS Grant-in-Aid (A)': '科研費 基盤研究(A)',
  'JSPS Grant-in-Aid (B)': '科研費 基盤研究(B)',
  'JSPS Grant-in-Aid (C)': '科研費 基盤研究(C)',
  'JSPS Grant-in-Aid for Scientific Research (B)': '科研費 基盤研究(B)',
  'JST J-RAPID Program': 'JST 国際緊急共同研究・調査支援プログラム（J-RAPID）',
  'JST/JICA SATREPS': 'JST/JICA 地球規模課題対応国際科学技術協力プログラム（SATREPS）',
  'Kobe University research fund': '神戸大学研究費',
  'Tohoku University Disaster Resilience Co-Creation Research Project': '東北大学 災害レジリエンス共創研究プロジェクト',
  'IRIDeS, Tohoku University': '東北大学災害科学国際研究所',
  'Kyoto University': '京都大学',
  "Okazaki Women's Junior College": '岡崎女子短期大学',
  'Shiga University': '滋賀大学',
  'Waseda University': '早稲田大学',
  'JDR Award for the Most Downloaded Article 2025': 'JDR 2025年 最多ダウンロード論文賞',
  'Journal of Disaster Research': 'Journal of Disaster Research',
  'Awarded to A. Sakurai and T. Sato': 'A. Sakurai・T. Sato 受賞',
  'For developing teacher training programmes supporting school evacuation planning for heavy-rainfall emergencies':
    '大雨時の学校避難計画を支える教員研修プログラムの開発に対して',
  'Aiko Sakurai': '桜井 愛子',

  // ---------- Publication notes ----------
  'Peer-reviewed · First author': '査読あり・筆頭著者',
  'First author': '筆頭著者',
  'Invited · First author': '招待・筆頭著者',
  'Joint editor': '共同編者',
  'First author · with K. Ogawa': '筆頭著者・K. Ogawaとの共著',
  'with E. Maly': 'E. Malyとの共著',
  'with T. Sato': 'T. Satoとの共著',
  'with R. Shaw': 'R. Shawとの共著',
  'with K. Takiguchi, T. Sato, R. Kimura': 'K. Takiguchi、T. Sato、R. Kimuraとの共著',

  // ---------- Research / Education / Outreach sections ----------
  Home: 'ホーム',
  'Prof. Sakurai': '桜井教授',
  'Themes & projects': '研究テーマ・プロジェクト',
  Courses: '授業',
  'Policy advocacy': '政策提言',
  'Thesis supervision': '論文指導',
  'Media coverage': 'メディア掲載',
  Outreach: '社会貢献',
  'Outreach activities': '社会貢献活動',
  "What's New": '新着情報',
  'What’s New': '新着情報',
  Partners: '連携機関',
  Fields: 'フィールド',
  'Expand all': 'すべて開く',
  'Collapse all': 'すべて閉じる',
  'More information ↗': '詳しくはこちら ↗',
  'No.': 'No.',
  Year: '年度',
  Country: '国・地域',
  'Thesis title': '論文題目',
  PhD: '博士論文',
  Master: '修士論文',
  Bachelor: '卒業論文',
  'Committees, memberships and roles': '委員・学会等の役職',
  'Social contribution': '社会貢献',
  'This section is being prepared. Staff can add entries in Admin → Site content.': 'このページは準備中です。',
  'Advisory work with ministries, local governments and international organisations, turning research into policy and practice.':
    '省庁・自治体・国際機関への助言を通じて、研究成果を政策と実践につなげています。',
  'Doctoral and master’s theses supervised by Prof. Sakurai.': '桜井教授が指導した博士論文・修士論文。',
  'Newspaper, television and web coverage of the seminar’s work.': 'ゼミの活動に関する新聞・テレビ・ウェブでの報道。',
  'Awards, committees and memberships, and work with governments, schools and communities.':
    '受賞、委員・学会活動、行政・学校・地域との協働。',
  'Disaster risk reduction education, school safety and recovery in Japan and across Asia, from policy design to classroom practice.':
    '日本とアジアにおける防災教育・学校安全・復興を、政策設計から教室での実践まで研究しています。',
  'Courses, thesis supervision and seminar life at the Graduate School of International Cooperation Studies, Kobe University.':
    '神戸大学大学院国際協力研究科での授業、論文指導、ゼミ活動。',
  'Social contribution through committees, training, media and exchanges with partners and visiting researchers.':
    '委員会、研修、メディア、連携機関や訪問研究者との交流を通じた社会貢献。',
  'Profile photo (optional)': 'プロフィール写真（任意）',
};

const MONTHS: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const FULL_MONTHS: Record<string, number> = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 };

/** Converts English date and period strings such as “Apr 2024 – present” or “26 Jun 2026”. */
function jaDates(s: string): string | undefined {
  let out = s;
  let hit = false;
  out = out.replace(/\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})\b/g, (_m, d, mo, y) => ((hit = true), `${y}年${MONTHS[mo]}月${d}日`));
  out = out.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})\b/g, (_m, mo, y) => ((hit = true), `${y}年${MONTHS[mo]}月`));
  out = out.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})\b/g, (_m, mo, y) => ((hit = true), `${y}年${FULL_MONTHS[mo]}月`));
  if (!hit) return undefined;
  return out.replace(/ – present/g, '〜現在').replace(/ – /g, '〜');
}

function lookup(text: string): string | undefined {
  return D[text] ?? D[text.trim()] ?? jaDates(text);
}

/**
 * Translates English text into Japanese when a translation is known.
 * Longer texts are translated line by line; unknown lines stay as they are.
 */
export function toJa(text: string | null | undefined): string {
  if (!text) return text ?? '';
  const whole = lookup(text);
  if (whole !== undefined) return whole;
  if (/\n/.test(text)) {
    const parts = text.split(/(\n+)/);
    let any = false;
    const out = parts.map((p) => {
      if (!p.trim() || /^\n+$/.test(p)) return p;
      const t = lookup(p);
      if (t !== undefined) any = true;
      return t ?? p;
    });
    if (any) return out.join('');
  }
  if (text.includes(' · ')) {
    const parts = text.split(' · ');
    const out = parts.map((p) => lookup(p) ?? p);
    if (out.some((p, i) => p !== parts[i])) return out.join('・');
  }
  return text;
}

export const hasJa = (text: string | null | undefined) => !!text && toJa(text) !== text;
