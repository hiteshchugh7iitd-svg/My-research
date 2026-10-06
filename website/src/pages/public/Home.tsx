import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Member, Post, Project, Publication } from '../../lib/amplify';
import { DEFAULTS } from '../../lib/defaults';
import { CATEGORY_LABELS, formatDate } from '../../lib/format';
import { pick, useLang } from '../../lib/i18n';
import { useContent, useModel } from '../../lib/store';
import { Img } from '../../components/ui';

function Hero() {
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
  return (
    <section className="hero" aria-label="Seminar photographs">
      {slides.map((s, idx) => (
        <div key={s.image + idx} className={'hero-slide' + (idx === i % n ? ' active' : '')} aria-hidden={idx !== i % n}>
          <Img k={s.image} alt={s.caption} />
        </div>
      ))}
      <div className="hero-shade" />
      <div className="hero-copy">
        <div className="container" style={{ width: '100%' }}>
          <div className="inner">
            <div className="eyebrow">{site.tagline}</div>
            <h1>{current?.headline || site.motto}</h1>
            <p>{current?.text || site.intro}</p>
            <div className="row" style={{ marginTop: 18 }}>
              {current?.link ? (
                <Link className="btn accent" to={current.link}>Read more</Link>
              ) : (
                <Link className="btn accent" to={sections.ctaPrimaryLink}>{sections.ctaPrimaryLabel}</Link>
              )}
              {sections.ctaSecondaryLabel && (
                <Link className="btn light" to={sections.ctaSecondaryLink}>{sections.ctaSecondaryLabel}</Link>
              )}
            </div>
          </div>
        </div>
      </div>
      {current?.caption && <div className="hero-caption">{current.caption}</div>}
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

export function PostCard({ post }: { post: Post }) {
  const { lang } = useLang();
  return (
    <article className="card linky">
      <Link to={`/news/${post.slug}`} className="thumb" tabIndex={-1} aria-hidden>
        <Img k={post.coverKey ?? post.imageKeys?.[0]} alt="" />
      </Link>
      <div className="body">
        <div className="row" style={{ gap: 8 }}>
          {post.category && <span className="tag">{CATEGORY_LABELS[post.category]}</span>}
          <span className="meta">{formatDate(post.eventDate ?? post.publishDate)}</span>
        </div>
        <h3>
          <Link to={`/news/${post.slug}`}>{pick(lang, post.title, post.titleJa)}</Link>
        </h3>
        {post.excerpt && <p className="excerpt">{post.excerpt}</p>}
      </div>
    </article>
  );
}

export default function Home() {
  const { t } = useLang();
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

      {sections.showTiles && tiles.length > 0 && (
        <section className="section tight">
          <div className="container">
            <div className="tiles">
              {tiles.map((tile) => (
                <Link key={tile.label + tile.link} className="tile" to={tile.link}>
                  <Img k={tile.image} alt="" />
                  <span>{tile.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {sections.showMotto && (
        <section className="section tight">
          <div className="container">
            <p className="motto">{site.motto}</p>
          </div>
        </section>
      )}

      {sections.showNews && (
      <section className="section" style={{ paddingTop: 20 }}>
        <div className="container">
          <h2 className="rule-title">{sections.newsHeading || t('recentNews')}</h2>
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
            <div className="empty">News and student reports will appear here once they are published from the admin console.</div>
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
            <div className="eyebrow">The seminar</div>
            <h2>{sections.aboutHeading}</h2>
            {prof.message.split(/\n\s*\n/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <div className="grid c2" style={{ marginTop: 24, gap: 14 }}>
              {themes.map((th) => (
                <div key={th.num} className="card pad" style={{ padding: 18 }}>
                  <div className="eyebrow" style={{ marginBottom: 4 }}>{th.num}</div>
                  <h3 style={{ fontSize: '1.02rem' }}>{th.title}</h3>
                  <p className="small muted" style={{ margin: 0 }}>{th.body.split('. ')[0]}.</p>
                </div>
              ))}
            </div>
          </div>
          <aside className="sidebar">
            <div className="widget">
              <h4>At a glance</h4>
              <div className="stats" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="stat"><b>{pubs.filter((p) => p.kind === 'PAPER').length || '—'}</b><span>Papers</span></div>
                <div className="stat"><b>{pubs.filter((p) => p.kind === 'TALK').length || '—'}</b><span>Talks</span></div>
                <div className="stat"><b>{projects.length || '—'}</b><span>Funded projects</span></div>
                <div className="stat"><b>{members.filter((m) => m.visible !== false && m.status === 'CURRENT').length || '—'}</b><span>Students</span></div>
              </div>
            </div>
            <div className="widget">
              <h4>Recent papers</h4>
              <ul>
                {featured.map((p) => (
                  <li key={p.id}>
                    <span className="small muted">{p.year}</span> · {p.doi ? <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer">{p.title}</a> : p.title}
                  </li>
                ))}
              </ul>
              <p className="small" style={{ marginTop: 10 }}>
                <Link to="/publications">All publications →</Link>
              </p>
            </div>
          </aside>
        </div>
      </section>
      )}
    </>
  );
}
