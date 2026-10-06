import { DEFAULTS } from '../../lib/defaults';
import { useContent } from '../../lib/store';
import { PageHeader, Paragraphs } from '../../components/ui';

export default function Contact() {
  const c = useContent('contact', DEFAULTS.contact);
  const partners = useContent('partnerLinks', DEFAULTS.partnerLinks);
  return (
    <>
      <PageHeader eyebrow="Contact" title="Contact" />
      <section className="section">
        <div className="container grid c2" style={{ gap: 40 }}>
          <div>
            <h2>Aiko Sakurai Seminar</h2>
            <p style={{ whiteSpace: 'pre-line' }}>{c.address}</p>
            <dl className="kv">
              <dt>E-mail</dt>
              <dd><a href={`mailto:${c.email}`}>{c.email}</a></dd>
              {c.phone && (<><dt>Telephone</dt><dd>{c.phone}</dd></>)}
              {c.office && (<><dt>Office</dt><dd>{c.office}</dd></>)}
            </dl>
            <p style={{ marginTop: 18 }}>
              <a className="btn secondary" href={c.mapUrl} target="_blank" rel="noreferrer">Open in Google Maps ↗</a>
            </p>
          </div>
          <div className="card pad" style={{ borderTop: '3px solid var(--terracotta)' }}>
            <h2 style={{ fontSize: '1.35rem' }}>Prospective students</h2>
            <Paragraphs text={c.prospective} />
            <a className="btn" href={`mailto:${c.email}?subject=${encodeURIComponent('Enquiry about joining the Sakurai Seminar')}`}>Write to Prof. Sakurai</a>
          </div>
        </div>
      </section>
      <section className="section alt">
        <div className="container">
          <h2>Partners and links</h2>
          <div className="chips">
            {partners.map((l) => (
              <a key={l.url} className="chip" href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
