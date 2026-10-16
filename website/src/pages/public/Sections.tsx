import { useMemo, useState } from 'react';
import type { Award } from '../../lib/amplify';
import { DEFAULTS } from '../../lib/defaults';
import { formatDate } from '../../lib/format';
import { useLang } from '../../lib/i18n';
import { useContent, useModel } from '../../lib/store';
import { Empty, Img, Lightbox, PageHeader, Paragraphs } from '../../components/ui';

const EMPTY = 'This section is being prepared. Staff can add entries in Admin → Site content.';

/** Policy advocacy and advisory work (Research → Policy advocacy). */
export function Advocacy() {
  const { tx, L } = useLang();
  const items = useContent('policyAdvocacy', DEFAULTS.policyAdvocacy);
  return (
    <>
      <PageHeader eyebrow={tx('Research')} title={tx('Policy advocacy')} intro={tx('Advisory work with ministries, local governments and international organisations, turning research into policy and practice.')} />
      <section className="section">
        <div className="container" style={{ maxWidth: 940 }}>
          {items.length ? (
            <ol className="numbered">
              {items.map((a, i) => (
                <li key={i}>
                  {a.image && (
                    <div className="media">
                      <Img k={a.image} alt="" />
                    </div>
                  )}
                  <h3>{L(a, 'title')}</h3>
                  {a.period && <p className="small muted">{tx(a.period)}</p>}
                  <Paragraphs text={L(a, 'body')} />
                  {a.link && (
                    <p className="small">
                      <a href={a.link} target="_blank" rel="noreferrer">{tx('More information ↗')}</a>
                    </p>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <Empty>{tx(EMPTY)}</Empty>
          )}
        </div>
      </section>
    </>
  );
}

/** Thesis supervision: headline numbers and tables per university and degree (Education → Thesis supervision). */
export function Thesis() {
  const { lang, tx, L } = useLang();
  const stats = useContent('thesisStats', DEFAULTS.thesisStats);
  const theses = useContent('theses', DEFAULTS.theses);
  const groups = useMemo(() => {
    const unis = [...new Set(theses.map((t) => t.university || ''))];
    return unis.map((u) => ({
      university: u,
      levels: [...new Set(theses.filter((t) => (t.university || '') === u).map((t) => t.level || ''))].map((lv) => ({
        level: lv,
        rows: theses.filter((t) => (t.university || '') === u && (t.level || '') === lv).sort((a, b) => String(a.year).localeCompare(String(b.year))),
      })),
    }));
  }, [theses]);
  return (
    <>
      <PageHeader eyebrow={tx('Education')} title={tx('Thesis supervision')} intro={tx('Doctoral and master’s theses supervised by Prof. Sakurai.')} />
      <section className="section">
        <div className="container">
          {stats.length > 0 && (
            <div className="stats" style={{ marginBottom: 30 }}>
              {stats.map((s, i) => (
                <div className="stat" key={i}>
                  <b>{s.value}</b>
                  <span>{L(s, 'label')}</span>
                </div>
              ))}
            </div>
          )}
          {groups.length ? (
            groups.map((g) => (
              <div key={g.university} style={{ marginBottom: 36 }}>
                {g.university && <h2 className="year-head">{L({ u: g.university }, 'u')}</h2>}
                {g.levels.map((lv) => (
                  <div key={lv.level} style={{ marginTop: 18 }}>
                    <h3>{lang === 'ja' ? `${tx(lv.level)}論文` : `${lv.level ? lv.level + ' ' : ''}theses supervised`}</h3>
                    <div className="table-wrap">
                      <table className="data">
                        <thead>
                          <tr><th style={{ width: 40 }}>{tx('No.')}</th><th style={{ width: 70 }}>{tx('Year')}</th><th>{tx('Name')}</th><th>{tx('Country')}</th><th>{tx('Thesis title')}</th></tr>
                        </thead>
                        <tbody>
                          {lv.rows.map((r, i) => (
                            <tr key={i}>
                              <td className="small muted">{i + 1}</td>
                              <td className="small">{r.year}</td>
                              <td>{L(r, 'name')}</td>
                              <td className="small">{L(r, 'country')}</td>
                              <td className="small">{L(r, 'title')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ))
          ) : (
            <Empty>{tx(EMPTY)}</Empty>
          )}
        </div>
      </section>
    </>
  );
}

/** Media coverage: clipping images and a year-by-year list (Outreach → Media coverage). */
export function Media() {
  const { tx, L } = useLang();
  const items = useContent('mediaCoverage', DEFAULTS.mediaCoverage);
  const [open, setOpen] = useState<number | null>(null);
  const sorted = [...items].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const clips = sorted.filter((m) => m.image);
  const years = [...new Set(sorted.map((m) => String(m.date).slice(0, 4) || '—'))];
  return (
    <>
      <PageHeader eyebrow={tx('Outreach')} title={tx('Media coverage')} intro={tx('Newspaper, television and web coverage of the seminar’s work.')} />
      <section className="section">
        <div className="container" style={{ maxWidth: 1000 }}>
          {clips.length > 0 && (
            <div className="clips">
              {clips.map((m, i) => (
                <button key={i} onClick={() => setOpen(i)} title={L(m, 'title')}>
                  <Img k={m.image} alt={L(m, 'title')} />
                </button>
              ))}
            </div>
          )}
          {open !== null && <Lightbox photos={clips.map((m) => ({ key: m.image, caption: [L(m, 'outlet'), L(m, 'title')].filter(Boolean).join(' — ') }))} index={open} onClose={() => setOpen(null)} />}
          {sorted.length ? (
            years.map((y) => (
              <div key={y}>
                <h3 className="year-head">{y}</h3>
                <ul className="pub-list">
                  {sorted
                    .filter((m) => (String(m.date).slice(0, 4) || '—') === y)
                    .map((m, i) => (
                      <li key={i} className="pub" style={{ gridTemplateColumns: '110px 1fr' }}>
                        <div className="small muted">{/^\d{4}-\d{2}-\d{2}$/.test(m.date) ? formatDate(m.date) : m.date}</div>
                        <div>
                          <div className="t">{m.link ? <a href={m.link} target="_blank" rel="noreferrer">{L(m, 'title') || L(m, 'outlet')}</a> : L(m, 'title') || L(m, 'outlet')}</div>
                          {m.title && m.outlet && <div className="v">{L(m, 'outlet')}</div>}
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            ))
          ) : (
            <Empty>{tx(EMPTY)}</Empty>
          )}
        </div>
      </section>
    </>
  );
}

/** Outreach activities: awards, memberships and roles, social contribution stories. */
export function Outreach() {
  const { tx, L } = useLang();
  const memberships = useContent('outreachMemberships', DEFAULTS.outreachMemberships);
  const stories = useContent('outreachStories', DEFAULTS.outreachStories);
  const { items: awards } = useModel<Award>('Award');
  const sortedAwards = [...awards].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  return (
    <>
      <PageHeader eyebrow={tx('Outreach')} title={tx('Outreach activities')} intro={tx('Awards, committees and memberships, and work with governments, schools and communities.')} />
      <section className="section">
        <div className="container" style={{ maxWidth: 940 }}>
          {sortedAwards.length > 0 && (
            <>
              <h2 className="rule-title">{tx('Awards')}</h2>
              <ul>
                {sortedAwards.map((a) => (
                  <li key={a.id} style={{ marginBottom: 6 }}>
                    <b>{L(a, 'title')}</b> — {[L(a, 'body'), L(a, 'date')].filter(Boolean).join(', ')}
                  </li>
                ))}
              </ul>
            </>
          )}
          {memberships.length > 0 && (
            <>
              <h2 className="rule-title" style={{ marginTop: 34 }}>{tx('Committees, memberships and roles')}</h2>
              <ul>
                {memberships.map((m, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    {L(m, 'text')} {m.period && <span className="muted small">({tx(m.period)})</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
          {stories.length > 0 && (
            <>
              <h2 className="rule-title" style={{ marginTop: 34 }}>{tx('Social contribution')}</h2>
              <ol className="numbered">
                {stories.map((s, i) => (
                  <li key={i}>
                    {s.image && (
                      <div className="media">
                        <Img k={s.image} alt="" />
                      </div>
                    )}
                    <h3>{L(s, 'title')}</h3>
                    <Paragraphs text={L(s, 'body')} />
                  </li>
                ))}
              </ol>
            </>
          )}
          {!sortedAwards.length && !memberships.length && !stories.length && <Empty>{tx(EMPTY)}</Empty>}
        </div>
      </section>
    </>
  );
}
