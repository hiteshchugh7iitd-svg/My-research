import { DEFAULTS } from '../../lib/defaults';
import { useLang } from '../../lib/i18n';
import { useContent } from '../../lib/store';
import { PageHeader, Paragraphs } from '../../components/ui';

export default function Contact() {
  const { t, tx, L } = useLang();
  const c = useContent('contact', DEFAULTS.contact);
  const partners = useContent('partnerLinks', DEFAULTS.partnerLinks);
  return (
    <>
      <PageHeader eyebrow={t('contact')} title={t('contact')} />
      <section className="section">
        <div className="container grid c2" style={{ gap: 40 }}>
          <div>
            <h2>{tx('Aiko Sakurai Seminar')}</h2>
            <p style={{ whiteSpace: 'pre-line' }}>{L(c, 'address')}</p>
            <dl className="kv">
              <dt>{tx('E-mail:').replace(/[:：]$/, '')}</dt>
              <dd><a href={`mailto:${c.email}`}>{c.email}</a></dd>
              {c.phone && (<><dt>{tx('Telephone')}</dt><dd>{c.phone}</dd></>)}
              {c.office && (<><dt>{tx('Office')}</dt><dd>{c.office}</dd></>)}
            </dl>
            <p style={{ marginTop: 18 }}>
              <a className="btn secondary" href={c.mapUrl} target="_blank" rel="noreferrer">{tx('Open in Google Maps ↗')}</a>
            </p>
          </div>
          <div className="card pad" style={{ borderTop: '3px solid var(--terracotta)' }}>
            <h2 style={{ fontSize: '1.35rem' }}>{tx('Prospective students')}</h2>
            <Paragraphs text={L(c, 'prospective')} />
            <a className="btn" href={`mailto:${c.email}?subject=${encodeURIComponent('Enquiry about joining the Sakurai Seminar')}`}>{tx('Write to Prof. Sakurai')}</a>
          </div>
        </div>
      </section>
      <section className="section alt">
        <div className="container">
          <h2>{tx('Partners and links')}</h2>
          <div className="chips">
            {partners.map((l) => (
              <a key={l.url} className="chip" href={l.url} target="_blank" rel="noreferrer">{L(l, 'label')} ↗</a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
