import starter from '../seed/starter.json';

/** Latest dated talks and papers, used as the first “What’s New” items until staff write their own. */
function initialWhatsNew() {
  const MONTH: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
  const talks = starter.publications
    .filter((p) => p.kind === 'TALK' && /\d{1,2} \w{3} \d{4}/.test(p.date))
    .slice(0, 3)
    .map((p) => {
      const [d, m, y] = p.date.split(' ');
      return { date: `${y}-${MONTH[m] ?? '01'}-${d.padStart(2, '0')}`, text: `${p.invited ? 'Invited talk' : 'Talk'}: “${p.title}” — ${p.venue}`, link: '/publications?kind=TALK' };
    });
  const papers = starter.publications
    .filter((p) => p.kind === 'PAPER' && p.year === 2026)
    .slice(0, 2)
    .map((p) => ({ date: '2026-01-01', text: `New paper: “${p.title}” — ${p.venue}`, link: '/publications?kind=PAPER' }));
  return [...talks, ...papers];
}

/**
 * Default text for every editable block. The site shows these until the block
 * is edited in Admin → Site content; "Import starter content" saves them to the
 * database so they can be changed.
 */
export type Link = { label: string; url: string };
export type Slide = { image: string; caption: string; headline?: string; text?: string; link?: string };
export type Tile = { label: string; image: string; link: string };

export const DEFAULTS = {
  site: {
    title: 'Aiko Sakurai Seminar',
    titleJa: '桜井愛子ゼミ',
    subtitle: 'Graduate School of International Cooperation Studies (GSICS), Kobe University',
    tagline: 'Disaster Education · School Safety · Resilience',
    motto: 'Grounded Thinking for a Better Planet',
    intro:
      'Research and graduate teaching on how schools and the communities around them prepare for, survive and recover from disaster — from Ishinomaki and Kobe to Banda Aceh, Tacloban and Kahramanmaraş.',
    announcement: '',
  },
  heroSlides: [
    { image: '/images/rokkodai-campus.jpg', caption: 'Seminar members, Kobe University Rokkodai campus' },
    { image: '/images/irides-study-visit.jpg', caption: 'Study visit to IRIDeS, Tohoku University, Sendai' },
    { image: '/images/global-challenge-course.jpg', caption: 'Global Challenge of Disaster Reduction, graduate course' },
    { image: '/images/coastal-fieldwork.jpg', caption: 'Coastal fieldwork — seawall and fishing port' },
    { image: '/images/seminar-gsics.jpg', caption: 'Seminar members, Kobe University GSICS' },
  ] as Slide[],
  homeTiles: [
    { label: 'Forthcoming events', image: '/images/global-challenge-course.jpg', link: '/news?category=EVENT' },
    { label: 'Student activities', image: '/images/coastal-fieldwork.jpg', link: '/news?category=STUDENT_ACTIVITY' },
    { label: 'Message from the professor', image: '/images/irides-study-visit.jpg', link: '/professor' },
    { label: 'Alumni', image: '/images/seminar-gsics.jpg', link: '/alumni' },
  ] as Tile[],
  homeSections: {
    showPillars: true,
    showWhatsNew: true,
    showPartners: true,
    showFields: true,
    showTiles: true,
    showMotto: true,
    showNews: true,
    showAbout: true,
    newsCount: 8,
    newsHeading: 'Recent news',
    aboutHeading: 'Between policy and the classroom',
    ctaPrimaryLabel: 'Join the seminar',
    ctaPrimaryLink: '/teaching',
    ctaSecondaryLabel: 'Research themes',
    ctaSecondaryLink: '/research',
    showPortrait: true,
    showProfileButtons: true,
    profileButtonCount: 4,
    researchText: 'Disaster risk reduction education, school safety and recovery in Japan and across Asia, from policy design to classroom practice.',
    educationText: 'Courses, thesis supervision and seminar life at the Graduate School of International Cooperation Studies, Kobe University.',
    outreachText: 'Social contribution through committees, training, media and exchanges with partners and visiting researchers.',
    whatsNewHeading: "What's New",
    whatsNewCount: 6,
    partnersHeading: 'Partners',
    fieldsHeading: 'Fields',
  },
  professor: {
    name: 'Aiko Sakurai',
    nameJa: '桜井 愛子',
    photo: '',
    titles:
      'Professor, Graduate School of International Cooperation Studies, Kobe University\nCross-appointed Professor, International Research Institute of Disaster Science (IRIDeS), Tohoku University',
    bio:
      'With extensive experience in international development, disaster risk reduction and global education initiatives, Prof. Sakurai brings a blend of practical expertise and academic insight to her research and teaching. Her professional path runs through the World Bank, international NGOs including Save the Children, and development consulting.\n\nSince moving to academia she has worked on disaster-resilient education systems and school–community collaboration in Japan and abroad, with an emphasis on interdisciplinary work that combines social science, engineering and environmental science.',
    message:
      'Prof. Sakurai came to the university after fifteen years in practice — the World Bank, Keidanren, the Cabinet Secretariat, development consulting, and Save the Children’s Tohoku recovery programme. That history shapes how the seminar works: research questions come from the field, and findings are meant to land in ministries, prefectural boards and staff rooms.\n\nStudents work at the intersection of education, disaster management and sustainable development, combining social science with engineering and environmental science.',
    researchAreas:
      'Sociology of Education — international educational development, school safety and disaster education.\nDisaster Prevention Engineering — social infrastructure.',
    keywords:
      'disaster education · school disaster resilience · capacity development for DRR · school–community partnerships · school management improvement · girls’ education · training development and evaluation',
  },
  contact: {
    address: 'Graduate School of International Cooperation Studies, Kobe University\n2-1 Rokkodai-cho, Nada-ku, Kobe 657-8501, Japan',
    email: 'sakuraia@people.kobe-u.ac.jp',
    phone: '',
    office: '',
    mapUrl: 'https://maps.google.com/?q=Kobe+University+GSICS',
    prospective:
      'Prospective students are welcome to write to Prof. Sakurai with a short research plan (one page), a CV and their intended programme (Master’s or PhD). Applications to GSICS are made through the university’s admissions process; please check the GSICS website for current deadlines.',
    instagram: 'https://www.instagram.com/aiko.sakurai/',
  },
  career: starter.content.career as { period: string; org: string; role: string; current?: boolean }[],
  education: starter.content.education as { period: string; org: string; degree: string }[],
  researchThemes: starter.content.researchThemes as { num: string; title: string; body: string; example: string }[],
  fieldSites: starter.content.fieldSites as { place: string; note: string }[],
  courses: starter.content.courses as { level: string; title: string; body: string }[],
  seminarLife: starter.content.seminarLife as { title: string; body: string }[],
  joinPoints: starter.content.joinPoints as { title: string; body: string }[],
  profileLinks: starter.content.profileLinks as Link[],
  partnerLinks: starter.content.partnerLinks as Link[],
  resources: starter.content.resources as { title: string; body: string }[],

  /** Short dated one-line updates shown on the home page. */
  whatsNew: initialWhatsNew() as { date: string; text: string; link?: string }[],
  /** Partner organisations shown as a logo row on the home page. */
  partners: (starter.content.partnerLinks as Link[]).filter((l) => !/instagram|linkedin/i.test(l.label)).map((l) => ({ name: l.label, logo: '', url: l.url })) as { name: string; logo: string; url: string }[],
  /** Country photo strip (“Fields”) at the bottom of the home page. */
  fieldStrip: (starter.content.fieldSites as { place: string }[]).map((f) => ({ country: f.place, image: '', link: '/research#fields' })) as { country: string; image: string; link: string }[],
  /** Book cover gallery shown on the Publications page. */
  bookCovers: [] as { title: string; image: string; link: string }[],
  /** Policy advocacy and advisory work. */
  policyAdvocacy: [] as { title: string; body: string; period: string; image: string; link: string }[],
  /** Headline numbers on the Thesis supervision page. */
  thesisStats: [] as { label: string; value: string }[],
  /** Theses supervised, one row per thesis. */
  theses: [] as { university: string; level: string; year: string; name: string; country: string; title: string }[],
  /** Newspaper, TV and web coverage. */
  mediaCoverage: [] as { date: string; outlet: string; title: string; link: string; image: string }[],
  /** Committees, society memberships, editorial boards, advisory roles. */
  outreachMemberships: [] as { text: string; period: string }[],
  /** Social contribution stories with an optional photo. */
  outreachStories: [] as { title: string; body: string; image: string }[],
  /** Optional overrides for the title and introduction at the top of each page. */
  pageText: [
    ['/professor', 'Prof. Sakurai'],
    ['/research', 'Research themes and projects'],
    ['/publications', 'Publications'],
    ['/advocacy', 'Policy advocacy'],
    ['/teaching', 'Courses'],
    ['/thesis', 'Thesis supervision'],
    ['/members', 'Students'],
    ['/alumni', 'Alumni'],
    ['/outreach', 'Outreach activities'],
    ['/media', 'Media coverage'],
    ['/visitors', 'Visitors'],
    ['/gallery', 'Gallery'],
    ['/news', 'News & events'],
    ['/contact', 'Contact'],
  ].map(([path, page]) => ({ page, path, title: '', intro: '' })) as { page: string; path: string; title: string; intro: string }[],
};

export type ContentId = keyof typeof DEFAULTS;
