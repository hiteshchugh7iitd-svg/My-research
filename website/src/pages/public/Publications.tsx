import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Publication } from '../../lib/amplify';
import { KIND_LABELS, KIND_SINGULAR, normalize } from '../../lib/format';
import { useModel } from '../../lib/store';
import { FileLink, Loading, PageHeader } from '../../components/ui';

const KINDS = ['PAPER', 'BOOK', 'REPORT', 'TALK'] as const;

export default function Publications() {
  const { items, loading } = useModel<Publication>('Publication');
  const [params, setParams] = useSearchParams();
  const kind = params.get('kind') ?? 'ALL';
  const year = params.get('year') ?? 'ALL';
  const [q, setQ] = useState('');
  const [peer, setPeer] = useState(false);
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v === 'ALL') p.delete(k);
    else p.set(k, v);
    setParams(p, { replace: true });
  };

  const years = useMemo(() => [...new Set(items.map((p) => p.year))].sort((a, b) => b - a), [items]);
  const results = useMemo(() => {
    const nq = normalize(q);
    return items
      .filter((p) => kind === 'ALL' || p.kind === kind)
      .filter((p) => year === 'ALL' || String(p.year) === year)
      .filter((p) => !peer || p.peerReviewed)
      .filter((p) => !nq || normalize([p.title, p.venue, p.authors, p.note].join(' ')).includes(nq))
      .sort((a, b) => b.year - a.year || (b.date ?? '').localeCompare(a.date ?? ''));
  }, [items, kind, year, q, peer]);

  const byYear = useMemo(() => {
    const m = new Map<number, Publication[]>();
    results.forEach((p) => m.set(p.year, [...(m.get(p.year) ?? []), p]));
    return [...m.entries()];
  }, [results]);

  return (
    <>
      <PageHeader
        eyebrow="Publications"
        title="Complete list of works"
        intro="Papers, books and chapters, reports and proceedings, and invited talks by Prof. Sakurai and seminar members. Records follow Prof. Sakurai’s researchmap profile."
      />
      <section className="section">
        <div className="container">
          <div className="stats" style={{ marginBottom: 26 }}>
            {KINDS.map((k) => (
              <div className="stat" key={k}>
                <b>{items.filter((p) => p.kind === k).length}</b>
                <span>{KIND_LABELS[k]}</span>
              </div>
            ))}
            <div className="stat">
              <b>{items.filter((p) => p.peerReviewed).length}</b>
              <span>Peer-reviewed</span>
            </div>
          </div>
          <div className="spread" style={{ marginBottom: 16 }}>
            <div className="chips">
              <button className={'chip' + (kind === 'ALL' ? ' active' : '')} onClick={() => set('kind', 'ALL')}>
                All<span className="n">{items.length}</span>
              </button>
              {KINDS.map((k) => (
                <button key={k} className={'chip' + (kind === k ? ' active' : '')} onClick={() => set('kind', k)}>
                  {KIND_LABELS[k]}
                  <span className="n">{items.filter((p) => p.kind === k).length}</span>
                </button>
              ))}
            </div>
            <div className="row">
              <label className="check">
                <input type="checkbox" checked={peer} onChange={(e) => setPeer(e.target.checked)} /> Peer-reviewed only
              </label>
              <select className="input" style={{ width: 'auto' }} value={year} onChange={(e) => set('year', e.target.value)} aria-label="Year">
                <option value="ALL">All years</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <input className="input" style={{ width: 220 }} placeholder="Search title, venue, author…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <p className="muted small">{results.length} records</p>
          {loading ? (
            <Loading />
          ) : (
            byYear.map(([y, list]) => (
              <div key={y}>
                <h3 className="year-head">{y}</h3>
                <ul className="pub-list">
                  {list.map((p) => (
                    <li key={p.id} className="pub">
                      <div className="yr">
                        <span className="tag grey" style={{ fontSize: '0.62rem' }}>{KIND_SINGULAR[p.kind ?? 'PAPER']}</span>
                      </div>
                      <div>
                        <div className="t">{p.title}</div>
                        {p.authors && <div className="v">{p.authors}</div>}
                        <div className="v">{[p.venue, p.date].filter(Boolean).join(' · ')}</div>
                        {(p.note || p.invited) && <div className="n">{p.note || 'Invited'}</div>}
                        <div className="links">
                          {p.doi && <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer">DOI {p.doi}</a>}
                          {p.url && <a href={p.url} target="_blank" rel="noreferrer">Link ↗</a>}
                          <FileLink k={p.pdfKey}>PDF</FileLink>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
