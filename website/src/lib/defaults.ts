import starter from '../seed/starter.json';

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
};

export type ContentId = keyof typeof DEFAULTS;
