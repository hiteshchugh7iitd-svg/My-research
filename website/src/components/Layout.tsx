import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { publicClient } from '../lib/amplify';
import { useAuth } from '../lib/auth';
import { DEFAULTS } from '../lib/defaults';
import { useLang } from '../lib/i18n';
import { useContent, useModel } from '../lib/store';
import type { Post } from '../lib/amplify';
import { BrandMark } from './ui';

const NAV = [
  { to: '/', key: 'home', end: true },
  { to: '/professor', key: 'professor' },
  { to: '/research', key: 'research' },
  { to: '/publications', key: 'publications' },
  { to: '/members', key: 'members' },
  { to: '/alumni', key: 'alumni' },
  { to: '/news', key: 'news' },
  { to: '/gallery', key: 'gallery' },
  { to: '/visitors', key: 'visitors' },
  { to: '/contact', key: 'contact' },
] as const;

/** Counts one visit per browser session and returns the all-time total. */
function useVisitCount(): number | undefined {
  const [total, setTotal] = useState<number>();
  useEffect(() => {
    let counted = false;
    try {
      counted = sessionStorage.getItem('visit-counted') === '1';
    } catch {
      /* storage blocked: count anyway */
    }
    const read = () =>
      publicClient.models.VisitStat.get({ id: 'total' })
        .then((r) => setTotal(r.data?.count ?? undefined))
        .catch(() => undefined);
    if (counted) {
      void read();
      return;
    }
    publicClient.mutations
      .recordVisit()
      .then((r) => {
        if (typeof r.data === 'number') {
          setTotal(r.data);
          try {
            sessionStorage.setItem('visit-counted', '1');
          } catch {
            /* ignore */
          }
        } else void read();
      })
      .catch(() => void read());
  }, []);
  return total;
}

export default function Layout() {
  const { t, tx, L, lang, setLang } = useLang();
  const auth = useAuth();
  const site = useContent('site', DEFAULTS.site);
  const contact = useContent('contact', DEFAULTS.contact);
  const { items: posts } = useModel<Post>('Post');
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState('');
  const visits = useVisitCount();

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const upcoming = posts
    .filter((p) => p.published && p.eventDate && p.eventDate >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => (a.eventDate ?? '').localeCompare(b.eventDate ?? ''))
    .slice(0, 4);

  return (
    <>
      <a href="#main" className="sr-only">
        Skip to content
      </a>
      <div className="topbar">
        <div className="container">
          <span className="affil">{tx('Kobe University · Graduate School of International Cooperation Studies · Cross-appointed IRIDeS, Tohoku University')}</span>
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
        </div>
      </div>
      <header className="masthead">
        <div className="container">
          <Link to="/" className="brand">
            <BrandMark />
            <div>
              <div className="brand-title">
                {lang === 'ja' ? site.titleJa : site.title}
                {lang === 'en' && <span className="ja">{site.titleJa}</span>}
              </div>
              <div className="brand-sub">{L(site, 'subtitle')}</div>
            </div>
          </Link>
          <div className="mast-tools">
            <div className="lang">
              <a className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
                English
              </a>
              <span>|</span>
              <a className={lang === 'ja' ? 'active' : ''} onClick={() => setLang('ja')}>
                日本語
              </a>
            </div>
            <form className="search-box" onSubmit={onSearch} role="search">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} aria-label="Search the site" />
              <button type="submit" aria-label="Search">
                ⌕
              </button>
            </form>
          </div>
        </div>
      </header>
      <nav className="mainnav" aria-label="Main">
        <div className="container">
          <button className="nav-toggle" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen}>
            {tx('☰ Menu')}
          </button>
          <ul className={menuOpen ? 'open' : ''}>
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={'end' in n} className={({ isActive }) => (isActive ? 'active' : '')}>
                  {t(n.key)}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="account">
            {auth.signedIn ? (
              <>
                {auth.isStaff && <Link to="/admin">{t('admin')}</Link>}
                <Link to="/portal">{t('portal')}</Link>
              </>
            ) : (
              <Link to="/login">{t('signIn')}</Link>
            )}
          </div>
        </div>
      </nav>
      {site.announcement && <div className="announcement">{L(site, 'announcement')}</div>}

      <main id="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container cols">
          <div>
            <h4>{tx('Address')}</h4>
            <p style={{ whiteSpace: 'pre-line' }}>{L(contact, 'address')}</p>
            <p>
              {tx('E-mail:')} <a href={`mailto:${contact.email}`}>{contact.email}</a>
              {contact.phone && (
                <>
                  <br />
                  {tx('Tel:')} {contact.phone}
                </>
              )}
            </p>
          </div>
          <div>
            <h4>{tx('The seminar')}</h4>
            <ul>
              <li><Link to="/professor">{t('professor')}</Link></li>
              <li><Link to="/research">{tx('Research themes & projects')}</Link></li>
              <li><Link to="/teaching">{tx('Teaching & joining the seminar')}</Link></li>
              <li><Link to="/members">{t('members')}</Link> · <Link to="/alumni">{t('alumni')}</Link></li>
              <li><Link to="/news?category=STUDENT_ACTIVITY">{tx('Student activities')}</Link></li>
            </ul>
          </div>
          <div>
            <h4>{tx('Upcoming events')}</h4>
            {upcoming.length ? (
              <ul>
                {upcoming.map((p) => (
                  <li key={p.id}>
                    <span className="small">{p.eventDate}</span> · <Link to={`/news/${p.slug}`}>{L(p, 'title')}</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small">{tx('No events scheduled.')} <Link to="/news">{t('news')}</Link></p>
            )}
          </div>
          <div className="visits">
            <h4>{tx('Website')}</h4>
            <p>
              <b>{visits !== undefined ? visits.toLocaleString() : '—'}</b> {t('visits')}
            </p>
            <ul>
              <li><a href={contact.instagram} target="_blank" rel="noreferrer">Instagram</a></li>
              <li><a href="https://researchmap.jp/aikosak" target="_blank" rel="noreferrer">researchmap</a></li>
              <li>{auth.signedIn ? <Link to="/portal">{tx('Members area')}</Link> : <Link to="/login">{tx('Member sign-in')}</Link>}</li>
            </ul>
          </div>
        </div>
        <div className="bottom">
          <div className="container">
            <span>{lang === 'ja' ? `© ${new Date().getFullYear()} 桜井愛子ゼミ 神戸大学国際協力研究科` : `© ${new Date().getFullYear()} Aiko Sakurai Seminar, Kobe University GSICS.`}</span>
            <span>{L(site, 'motto')}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
