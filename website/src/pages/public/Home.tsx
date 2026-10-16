import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Member, Post, Project, Publication } from '../../lib/amplify';
import { DEFAULTS } from '../../lib/defaults';
import { CATEGORY_LABELS, formatDate } from '../../lib/format';
import { useLang } from '../../lib/i18n';
import { useContent, useModel } from '../../lib/store';
import { Img, useVisibleChildren } from '../../components/ui';
import { PILLARS, type Pillar } from '../../lib/sitemap';

/** First sentence of a text, in either language. */
const firstSentence = (x: string) => (x.includes('。') ? x.split('。')[0] + '。' : x.split('. ')[0] + (x.includes('. ') ? '.' : ''));

function Hero() {
  const { tx, L } = useLang();
  const slides = useContent('heroSlides', DEFAULTS.heroSlides);
  const site = useContent('site', DEFAULTS.site);
  const sections = { ...DEFAULTS.homeSections, ...useContent('homeSections', DEFAULTS.homeSections) };
  const [i, setI] = useState(0);
  const n = slides.length || 1;
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 6500);
    return () => clearInterval(t);
  }, [n]);
  const current = slides[i % n];
  const prof = useContent('professor', DEFAULTS.professor);
  const links = useContent('profileLinks', DEFAULTS.profileLinks);
  const buttons = sections.showProfileButtons ? links.slice(0, Number(sections.profileButtonCount) || 4) : [];
  return (
    <section className="hero" aria-label="Seminar photographs">
      {slides.map((s, idx) => (
        <div key={s.image + idx} className={'hero-slide' + (idx === i % n ? ' active' : '')} aria-hidden={idx !== i % n}>
          <Img k={s.image} alt={L(s, 'caption')} />
        </div>
      ))}
      <div className="hero-shade" />
      <div className="hero-copy">
        <div className="container" style={{ width: '100%' }}>
          <div className="inner">
            <div className="eyebrow">{L(site, 'tagline')}</div>
            <h1>{L(current, 'headline') || L(site, 'motto')}</h1>
            <p>{L(current, 'text') || L(site, 'intro')}</p>
            <div className="row" style={{ marginTop: 18 }}>
              {current?.link ? (
                <Link className="btn accent" to={current.link}>{tx('Read more')}</Link>
              ) : (
                <Link className="btn accent" to={sections.ctaPrimaryLink}>{tx(sections.ctaPrimaryLabel)}</Link>
              )}
              {sections.ctaSecondaryLabel && (
                <Link className="btn light" to={sections.ctaSecondaryLink}>{tx(sections.ctaSecondaryLabel)}</Link>
              )}
            </div>
            {buttons.length > 0 && (
              <div className="profile-buttons">
                {buttons.map((b) => (
                  <a key={b.url} href={b.url} target="_blank" rel="noreferrer">{tx(b.label)} ↗</a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {sections.showPortrait && prof.photo && (
        <Link to="/professor" className="hero-portrait" aria-label={L(prof, 'name')}>
          <Img k={prof.photo} alt={L(prof, 'name')} />
        </Link>
      )}
      {current?.caption && <div className="hero-caption">{L(current, 'caption')}</div>}
      {n > 1 && (
        <div className="hero-controls">
          <button onClick={() => setI((x) => (x - 1 + n) % n)} aria-label="Previous photo">‹</button>
          <button onClick={() => setI((x) => (x + 1) % n)} aria-label="Next photo">›</button>
          <div className="hero-dots">
            {slides.map((_, idx) => (
              <button key={idx} className={idx === i % n ? 'active' : ''} onClick={() => setI(idx)} aria-label={`Photo ${idx + 1}`} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

const PILLAR_ICON: Record<string, string> = { research: '◎', education: '✎', outreach: '❖' };

function PillarBlock({ pillar, text }: { pillar: Pillar; text: string }) {
  const { tx } = useLang();
  const children = useVisibleChildren(pillar);
  return (
    <div className="pillar">
      <h3><span className="ico" aria-hidden>{PILLAR_ICON[pillar.key]}</span><Link to={children[0]?.to ?? '/'}>{tx(pillar.label)}</Link></h3>
      <p>{text}</p>
      <ul>
        {children.map((c) => (
          <li key={c.to}><Link to={c.to}>{tx(c.label)}</Link></li>
        ))}
      </ul>
    </div>
  );
}

function WhatsNew({ heading, count }: { heading: string; count: number }) {
  const { tx, L } = useLang();
  const items = useContent('whatsNew', DEFAULTS.whatsNew);
  const list = [...items].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, count || 6);
  if (!list.length) return null;
  return (
    <section className="section whatsnew">
      <div className="container">
        <h2>{tx(heading)}</h2>
        <ul>
          {list.map((w, idx) => {
            const text = L(w, 'text');
            const ext = w.link && /^https?:/.test(w.link);
            return (
              <li key={idx}>
                <time>{formatDate(w.date)}</time>
                <span>
                  {!w.link ? text : ext ? <a href={w.link} target="_blank" rel="noreferrer">{text}</a> : <Link to={w.link}>{text}</Link>}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function Partners({ heading }: { heading: string }) {
  const { tx, L } = useLang();
  const partners = useContent('partners', DEFAULTS.partners);
  if (!partners.length) return null;
  return (
    <section className="section tight">
      <div className="container">
        <h2 className="rule-title">{tx(heading)}</h2>
        <div className="partners">
          {partners.map((p) => (
            <a key={p.name + p.url} href={p.url || undefined} target="_blank" rel="noreferrer" title={L(p, 'name')}>
              {p.logo ? <Img k={p.logo} alt={L(p, 'name')} /> : L(p, 'name')}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Fields({ heading }: { heading: string }) {
  const { tx, L } = useLang();
  const fields = useContent('fieldStrip', DEFAULTS.fieldStrip);
  if (!fields.length) return null;
  return (
    <section aria-label={tx(heading)}>
      <h2 className="fields-title">{tx(heading)}</h2>
      <div className="fields">
        {fields.map((f) => (
          <Link key={f.country} to={f.link || '/research#fields'}>
            {f.image && <Img k={f.image} alt="" />}
            <span>{L(f, 'country')}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function PostCard({ post }: { post: Post }) {
  const { tx, L } = useLang();
  return (
    <article className="card linky">
      <Link to={`/news/${post.slug}`} className="thumb" tabIndex={-1} aria-hidden>
        <Img k={post.coverKey ?? post.imageKeys?.[0]} alt="" />
      </Link>
      <div className="body">
        <div className="row" style={{ gap: 8 }}>
          {post.category && <span className="tag">{tx(CATEGORY_LABELS[post.category])}</span>}
          <span className="meta">{formatDate(post.eventDate ?? post.publishDate)}</span>
        </div>
        <h3>
          <Link to={`/news/${post.slug}`}>{L(post, 'title')}</Link>
        </h3>
        {post.excerpt && <p className="excerpt">{L(post, 'excerpt')}</p>}
      </div>
    </article>
  );
}

export default function Home() {
  const { t, tx, L } = useLang();
  const site = useContent('site', DEFAULTS.site);
  const sections = { ...DEFAULTS.homeSections, ...useContent('homeSections', DEFAULTS.homeSections) };
  const tiles = useContent('homeTiles', DEFAULTS.homeTiles);
  const prof = useContent('professor', DEFAULTS.professor);
  const themes = useContent('researchThemes', DEFAULTS.researchThemes);
  const { items: posts, loading } = useModel<Post>('Post');
  const { items: pubs } = useModel<Publication>('Publication');
  const { items: projects } = useModel<Project>('Project');
  const { items: members } = useModel<Member>('Member');

  const recent = posts
    .filter((p) => p.published)
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (b.publishDate ?? '').localeCompare(a.publishDate ?? ''))
    .slice(0, Number(sections.newsCount) || 8);
  const featured = pubs
    .filter((p) => p.kind === 'PAPER')
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || b.year - a.year)
    .slice(0, 5);

  return (
    <>
      <Hero />

      {sections.showPillars && (
        <section className="section" style={{ paddingTop: sections.showPortrait ? 70 : undefined }}>
          <div className="container pillars">
            {PILLARS.map((p) => (
              <PillarBlock key={p.key} pillar={p} text={L(sections, `${p.key}Text`)} />
            ))}
          </div>
        </section>
      )}

      {sections.showWhatsNew && <WhatsNew heading={sections.whatsNewHeading} count={Number(sections.whatsNewCount)} />}

      {sections.showTiles && tiles.length > 0 && (
        <section className="section tight">
          <div className="container">
            <div className="tiles">
              {tiles.map((tile) => (
                <Link key={tile.label + tile.link} className="tile" to={tile.link}>
                  <Img k={tile.image} alt="" />
                  <span>{L(tile, 'label')}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {sections.showMotto && (
        <section className="section tight">
          <div className="container">
            <p className="motto">{L(site, 'motto')}</p>
          </div>
        </section>
      )}

      {sections.showNews && (
      <section className="section" style={{ paddingTop: 20 }}>
        <div className="container">
          <h2 className="rule-title">{tx(sections.newsHeading) || t('recentNews')}</h2>
          {loading ? (
            <div className="loading">
              <span className="spinner" />
            </div>
          ) : recent.length ? (
            <div className="grid c4">
              {recent.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          ) : (
            <div className="empty">{tx('News and student reports will appear here once they are published from the admin console.')}</div>
          )}
          <div style={{ textAlign: 'center', marginTop: 26 }}>
            <Link className="btn secondary" to="/news">
              {t('allNews')} →
            </Link>
          </div>
        </div>
      </section>
      )}

      {sections.showAbout && (
      <section className="section alt">
        <div className="container layout-side">
          <div>
            <div className="eyebrow">{tx('The seminar')}</div>
            <h2>{tx(sections.aboutHeading)}</h2>
            {L(prof, 'message').split(/\n\s*\n/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <div className="grid c2" style={{ marginTop: 24, gap: 14 }}>
              {themes.map((th) => (
                <div key={th.num} className="card pad" style={{ padding: 18 }}>
                  <div className="eyebrow" style={{ marginBottom: 4 }}>{th.num}</div>
                  <h3 style={{ fontSize: '1.02rem' }}>{L(th, 'title')}</h3>
                  <p className="small muted" style={{ margin: 0 }}>{firstSentence(L(th, 'body'))}</p>
                </div>
              ))}
            </div>
          </div>
          <aside className="sidebar">
            <div className="widget">
              <h4>{tx('At a glance')}</h4>
              <div className="stats" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="stat"><b>{pubs.filter((p) => p.kind === 'PAPER').length || '—'}</b><span>{tx('Papers')}</span></div>
                <div className="stat"><b>{pubs.filter((p) => p.kind === 'TALK').length || '—'}</b><span>{tx('Talks')}</span></div>
                <div className="stat"><b>{projects.length || '—'}</b><span>{tx('Funded projects')}</span></div>
                <div className="stat"><b>{members.filter((m) => m.visible !== false && m.status === 'CURRENT').length || '—'}</b><span>{tx('Students')}</span></div>
              </div>
            </div>
            <div className="widget">
              <h4>{tx('Recent papers')}</h4>
              <ul>
                {featured.map((p) => (
                  <li key={p.id}>
                    <span className="small muted">{p.year}</span> · {p.doi ? <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer">{p.title}</a> : p.title}
                  </li>
                ))}
              </ul>
              <p className="small" style={{ marginTop: 10 }}>
                <Link to="/publications">{tx('All publications →')}</Link>
              </p>
            </div>
          </aside>
        </div>
      </section>
      )}

      {sections.showPartners && <Partners heading={sections.partnersHeading} />}
      {sections.showFields && <Fields heading={sections.fieldsHeading} />}
    </>
  );
}
