import type { Guest } from '../../lib/amplify';
import { formatDate } from '../../lib/format';
import { useModel } from '../../lib/store';
import { Loading, PageHeader } from '../../components/ui';

export default function Visitors() {
  const { items, loading } = useModel<Guest>('Guest');
  const countries = [...new Set(items.map((g) => g.country || 'Other'))].sort((a, b) => (a === 'Japan' ? -1 : b === 'Japan' ? 1 : a.localeCompare(b)));
  return (
    <>
      <PageHeader eyebrow="Visitors" title="Visitors to the seminar" intro="Scholars, practitioners and policymakers who have visited the seminar to give lectures, join workshops and meet students." />
      <section className="section">
        <div className="container">
          {loading ? (
            <Loading />
          ) : items.length ? (
            <>
              <div className="chips" style={{ marginBottom: 20 }}>
                {countries.map((c) => (
                  <a key={c} className="chip" href={`#c-${encodeURIComponent(c)}`}>
                    {c}<span className="n">{items.filter((g) => (g.country || 'Other') === c).length}</span>
                  </a>
                ))}
              </div>
              {countries.map((c) => (
                <div key={c} className="guest-country" id={`c-${encodeURIComponent(c)}`}>
                  <h3>{c}</h3>
                  <div>
                    {items
                      .filter((g) => (g.country || 'Other') === c)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((g) => (
                        <div key={g.id} className="guest">
                          <b>{g.name}</b>
                          <div className="small">{[g.position, g.affiliation].filter(Boolean).join(', ')}</div>
                          {(g.visitDate || g.note) && <div className="small muted">{[g.visitDate && formatDate(g.visitDate), g.note].filter(Boolean).join(' · ')}</div>}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="empty">The list of visitors is maintained in the admin console.</div>
          )}
        </div>
      </section>
    </>
  );
}
