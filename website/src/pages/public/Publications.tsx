import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Publication } from '../../lib/amplify';
import { KIND_LABELS, KIND_SINGULAR, normalize } from '../../lib/format';
import { useLang } from '../../lib/i18n';
import { DEFAULTS } from '../../lib/defaults';
import { useContent, useModel } from '../../lib/store';
import { FileLink, Img, Loading, PageHeader } from '../../components/ui';

const KINDS = ['PAPER', 'BOOK', 'REPORT', 'TALK'] as const;

/** Underlines Prof. Sakurai's name in author lists (English and Japanese spellings). */
const ME = /(Sakurai,?\s*A(?:iko|\.)?|A(?:iko|\.)\s*Sakurai|桜井\s*愛子|櫻井\s*愛子)/g;
function Me({ text }: { text: string }): ReactNode {
  const parts = text.split(ME);
  return parts.map((part, i) => (i % 2 ? <span key={i} className="me">{part}</span> : <Fragment key={i}>{part}</Fragment>));
}

function BookCovers() {
  const { L } = useLang();
  const covers = useContent('bookCovers', DEFAULTS.bookCovers);
  if (!covers.length) return null;
  return (
    <div className="covers">
      {covers.map((c, i) => {
        const inner = (
          <>
            {c.image ? <Img k={c.image} alt={L(c, 'title')} /> : <div className="ph" aria-hidden />}
            <span>{L(c, 'title')}</span>
          </>
        );
        return c.link ? <a key={i} href={c.link} target="_blank" rel="noreferrer">{inner}</a> : <a key={i}>{inner}</a>;
      })}
    </div>
  );
}

export default function Publications() {
  const { tx } = useLang();
  const { items, loading } = useModel<Publication>('Publication');
  const [params, setParams] = useSearchParams();
  const kind = params.get('kind') ?? 'ALL';
  const year = params.get('year') ?? 'ALL';
  const [q, setQ] = useState('');
  const [peer, setPeer] = useState(false);
  const [toggled, setToggled] = useState<Record<number, boolean>>({});
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
  // The two most recent years start open; searching or filtering by year opens everything.
  const startOpen = (idx: number) => idx < 2 || !!q || year !== 'ALL';
  const isOpen = (y: number, idx: number) => toggled[y] ?? startOpen(idx);
  const setAll = (open: boolean) => setToggled(Object.fromEntries(byYear.map(([y]) => [y, open])));

  return (
    <>
      <PageHeader
        eyebrow={tx('Publications')}
        title={tx('Complete list of works')}
        intro={tx('Papers, books and chapters, reports and proceedings, and invited talks by Prof. Sakurai and seminar members. Records follow Prof. Sakurai’s researchmap profile.')}
      />
      <section className="section">
        <div className="container">
          <div className="stats" style={{ marginBottom: 26 }}>
            {KINDS.map((k) => (
              <div className="stat" key={k}>
                <b>{items.filter((p) => p.kind === k).length}</b>
                <span>{tx(KIND_LABELS[k])}</span>
              </div>
            ))}
            <div className="stat">
              <b>{items.filter((p) => p.peerReviewed).length}</b>
              <span>{tx('Peer-reviewed')}</span>
            </div>
          </div>
          <div className="spread" style={{ marginBottom: 16 }}>
            <div className="chips">
              <button className={'chip' + (kind === 'ALL' ? ' active' : '')} onClick={() => set('kind', 'ALL')}>
                {tx('All')}<span className="n">{items.length}</span>
              </button>
              {KINDS.map((k) => (
                <button key={k} className={'chip' + (kind === k ? ' active' : '')} onClick={() => set('kind', k)}>
                  {tx(KIND_LABELS[k])}
                  <span className="n">{items.filter((p) => p.kind === k).length}</span>
                </button>
              ))}
            </div>
            <div className="row">
              <label className="check">
                <input type="checkbox" checked={peer} onChange={(e) => setPeer(e.target.checked)} /> {tx('Peer-reviewed only')}
              </label>
              <select className="input" style={{ width: 'auto' }} value={year} onChange={(e) => set('year', e.target.value)} aria-label="Year">
                <option value="ALL">{tx('All years')}</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <input className="input" style={{ width: 220 }} placeholder={tx('Search title, venue, author…')} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          {(kind === 'ALL' || kind === 'BOOK') && <BookCovers />}
          <div className="spread">
            <p className="muted small">{results.length} {tx('records')}</p>
            {byYear.length > 2 && (
              <div className="row" style={{ gap: 6 }}>
                <button className="btn ghost sm" onClick={() => setAll(true)}>{tx('Expand all')}</button>
                <button className="btn ghost sm" onClick={() => setAll(false)}>{tx('Collapse all')}</button>
              </div>
            )}
          </div>
          {loading ? (
            <Loading />
          ) : (
            byYear.map(([y, list], idx) => (
              <div key={y}>
                <button className="year-toggle" aria-expanded={isOpen(y, idx)} onClick={() => setToggled({ ...toggled, [y]: !isOpen(y, idx) })}>
                  <span>{y}</span>
                  <span className="n">{list.length} {tx('records')} {isOpen(y, idx) ? '▲' : '▼'}</span>
                </button>
                {isOpen(y, idx) && (
                <ul className="pub-list">
                  {list.map((p) => (
                    <li key={p.id} className="pub">
                      <div className="yr">
                        <span className="tag grey" style={{ fontSize: '0.62rem' }}>{tx(KIND_SINGULAR[p.kind ?? 'PAPER'])}</span>
                      </div>
                      <div>
                        <div className="t">{p.title}</div>
                        {p.authors && <div className="v"><Me text={p.authors} /></div>}
                        <div className="v">{[p.venue, tx(p.date)].filter(Boolean).join(' · ')}</div>
                        {(p.note || p.invited) && <div className="n">{tx(p.note) || tx('Invited')}</div>}
                        <div className="links">
                          {p.doi && <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer">DOI {p.doi}</a>}
                          {p.url && <a href={p.url} target="_blank" rel="noreferrer">Link ↗</a>}
                          <FileLink k={p.pdfKey}>PDF</FileLink>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
