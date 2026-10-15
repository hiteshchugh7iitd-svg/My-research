import type { Award } from '../../lib/amplify';
import { useLang } from '../../lib/i18n';
import { DEFAULTS } from '../../lib/defaults';
import { useContent, useModel } from '../../lib/store';
import { Img, PageHeader, Paragraphs } from '../../components/ui';

export default function Professor() {
  const { lang, tx, L } = useLang();
  const prof = useContent('professor', DEFAULTS.professor);
  const career = useContent('career', DEFAULTS.career);
  const education = useContent('education', DEFAULTS.education);
  const links = useContent('profileLinks', DEFAULTS.profileLinks);
  const { items: awards } = useModel<Award>('Award');
  const sortedAwards = [...awards].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

  return (
    <>
      <PageHeader eyebrow={tx('Profile')} title={lang === 'ja' ? <>{prof.nameJa} 教授</> : <>Prof. {prof.name} <span style={{ fontWeight: 400, fontSize: '0.6em', opacity: 0.8 }}>{prof.nameJa}</span></>} />
      <section className="section">
        <div className="container">
          <div className="profile-head">
            <div className="portrait">
              <Img k={prof.photo || null} alt={prof.name} fallback="AS" />
            </div>
            <div>
              <p style={{ whiteSpace: 'pre-line', fontWeight: 600, color: 'var(--teal-800)' }}>{L(prof, 'titles')}</p>
              <Paragraphs text={L(prof, 'bio')} />
              <div className="chips" style={{ marginTop: 12 }}>
                {links.map((l) => (
                  <a key={l.url} className="chip" href={l.url} target="_blank" rel="noreferrer">
                    {L(l, 'label')} ↗
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container grid c2" style={{ gap: 40 }}>
          <div>
            <h2>{tx('Message to students')}</h2>
            <Paragraphs text={L(prof, 'message')} />
            <h3 style={{ marginTop: 28 }}>{tx('Research areas')}</h3>
            <Paragraphs text={L(prof, 'researchAreas').replace(/\n/g, '\n\n')} />
            <p className="muted small">{L(prof, 'keywords')}</p>
          </div>
          <div>
            <h2>{tx('Education')}</h2>
            <ul className="timeline">
              {education.map((e) => (
                <li key={e.period + e.org}>
                  <div className="when">{L(e, 'period')}</div>
                  <div className="what">{L(e, 'org')}</div>
                  <div className="small">{L(e, 'degree')}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid c2" style={{ gap: 40 }}>
          <div>
            <h2>{tx('Career')}</h2>
            <ul className="timeline">
              {career.map((c) => (
                <li key={c.period + c.org + c.role} className={c.current ? 'current' : ''}>
                  <div className="when">{L(c, 'period')}</div>
                  <div className="what">{L(c, 'org')}</div>
                  <div className="small">{L(c, 'role')}</div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>{tx('Awards')}</h2>
            {sortedAwards.length ? (
              <ul className="pub-list">
                {sortedAwards.map((a) => (
                  <li key={a.id} className="pub">
                    <div className="yr">{a.year ?? ''}</div>
                    <div>
                      <div className="t">{L(a, 'title')}</div>
                      <div className="v">{[L(a, 'body'), L(a, 'date')].filter(Boolean).join(' · ')}</div>
                      {a.note && <div className="n">{L(a, 'note')}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{tx('Awards are listed here once added in the admin console.')}</p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
