import type { Project } from '../../lib/amplify';
import { DEFAULTS } from '../../lib/defaults';
import { useLang } from '../../lib/i18n';
import { useContent, useModel } from '../../lib/store';
import { Img, PageHeader } from '../../components/ui';

export default function Research() {
  const { lang, tx, L } = useLang();
  const themes = useContent('researchThemes', DEFAULTS.researchThemes);
  const sites = useContent('fieldSites', DEFAULTS.fieldSites);
  const { items: projects } = useModel<Project>('Project');
  const sorted = [...projects].sort((a, b) => Number(!!b.ongoing) - Number(!!a.ongoing) || (a.sortOrder ?? 100) - (b.sortOrder ?? 100));

  return (
    <>
      <PageHeader
        eyebrow={tx('Research')}
        title={tx('Research themes and projects')}
        intro={tx('How schools and the communities around them prepare for, survive and recover from disaster — studied in the field, with partners, across Asia and beyond.')}
      />
      <section className="section">
        <div className="container grid c2">
          {themes.map((t) => (
            <article key={t.num} className="card pad">
              <div className="eyebrow">{t.num}</div>
              <h2 style={{ fontSize: '1.35rem' }}>{L(t, 'title')}</h2>
              <p>{L(t, 'body')}</p>
              {t.example && (
                <p className="small muted" style={{ margin: 0 }}>
                  <b>{tx('Representative work:')}</b> {L(t, 'example')}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="section-head">
            <h2>{tx('Where we work')}</h2>
          </div>
          <div className="grid c4">
            {sites.map((s) => (
              <div key={s.place} className="card pad" style={{ borderTop: '3px solid var(--gold)' }}>
                <h3>{L(s, 'place')}</h3>
                <p className="small muted" style={{ margin: 0 }}>{L(s, 'note')}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>{tx('Funded research projects')}</h2>
            <span className="muted small">{lang === 'ja' ? `実施中 ${sorted.filter((p) => p.ongoing).length}件 ・ 全${sorted.length}件` : `${sorted.filter((p) => p.ongoing).length} ongoing · ${sorted.length} in total`}</span>
          </div>
          {sorted.length ? (
            <div className="grid c2">
              {sorted.map((p) => (
                <article key={p.id} className="card">
                  {p.coverKey && (
                    <div className="thumb">
                      <Img k={p.coverKey} alt="" />
                    </div>
                  )}
                  <div className="body">
                    <div className="row" style={{ gap: 6 }}>
                      <span className={'tag ' + (p.role === 'Principal Investigator' ? 'accent' : '')}>{tx(p.role)}</span>
                      {p.ongoing ? <span className="tag ok">{tx('Ongoing')}</span> : <span className="tag grey">{tx('Completed')}</span>}
                    </div>
                    <h3>{lang === 'ja' ? p.titleJa || p.titleEn : p.titleEn}</h3>
                    {lang === 'en' && p.titleJa && <div className="small muted">{p.titleJa}</div>}
                    <div className="meta">{[tx(p.funder), tx(p.period), tx(p.host)].filter(Boolean).join(' · ')}</div>
                    {p.summary && <p className="small" style={{ margin: '6px 0 0' }}>{L(p, 'summary')}</p>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">{tx('Projects appear here once added in the admin console.')}</div>
          )}
        </div>
      </section>
    </>
  );
}
