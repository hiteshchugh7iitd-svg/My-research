import { createContext, useContext, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'ja';

const DICT = {
  home: ['Home', 'ホーム'],
  professor: ['Prof. Sakurai', '桜井教授'],
  research: ['Research', '研究'],
  publications: ['Publications', '業績'],
  members: ['Students', 'ゼミ生'],
  alumni: ['Alumni', '修了生'],
  news: ['News & Events', 'ニュース'],
  gallery: ['Gallery', 'ギャラリー'],
  visitors: ['Visitors', '来訪者'],
  teaching: ['Teaching', '教育'],
  contact: ['Contact', 'お問い合わせ'],
  signIn: ['Sign in', 'ログイン'],
  signOut: ['Sign out', 'ログアウト'],
  portal: ['My page', 'マイページ'],
  admin: ['Admin', '管理'],
  search: ['Search…', '検索…'],
  recentNews: ['Recent news', '最新ニュース'],
  readMore: ['Read more', '続きを読む'],
  allNews: ['All news', 'ニュース一覧'],
  labName: ['Aiko Sakurai Seminar', '桜井愛子ゼミ'],
  labSub: ['Graduate School of International Cooperation Studies (GSICS), Kobe University', '神戸大学大学院国際協力研究科'],
  visits: ['visits', '訪問'],
  motto: ['Grounded Thinking for a Better Planet', '現場から考え、よりよい地球へ'],
  currentMembers: ['Current members', '在籍メンバー'],
  noItems: ['Nothing here yet.', 'まだ掲載がありません。'],
} as const;

export type Key = keyof typeof DICT;

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }>({
  lang: 'en',
  setLang: () => undefined,
  t: (k) => DICT[k][0],
});

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('lang');
    if (saved === 'en' || saved === 'ja') return saved;
  } catch {
    /* storage unavailable */
  }
  return 'en';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = (l: Lang) => {
    setLangState(l);
    document.documentElement.lang = l;
    try {
      localStorage.setItem('lang', l);
    } catch {
      /* ignore */
    }
  };
  const t = (k: Key) => DICT[k][lang === 'en' ? 0 : 1];
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

/** Picks the Japanese variant of a field when Japanese is selected and it exists. */
export function pick(lang: Lang, en?: string | null, ja?: string | null): string {
  return (lang === 'ja' && ja ? ja : en || ja) ?? '';
}
