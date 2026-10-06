/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listAll, userClient, unwrap, type AuditLog, type Member, type MemberProfile, type ModelName } from '../../lib/amplify';
import { changed } from '../../lib/audit';
import { download, parseCsv, toCsv } from '../../lib/csv';
import { formatDate, normalize, PROGRAM_LABELS, STATUS_LABELS } from '../../lib/format';
import { mergeMembers } from '../../lib/members';
import { DropZone } from '../../components/fields';
import { Loading, useToast } from '../../components/ui';
import { useLiveModel } from './crud';
import { runPool } from './dashboard';
import { saveMember } from './members';

type Kind = 'members' | 'publications' | 'guests';
type Row = { data: Record<string, any>; matchId?: string; matchLabel?: string; error?: string; action: 'create' | 'update' | 'skip' };

const yes = (v: string) => /^(y|yes|true|1|✓|はい)$/i.test(v.trim());
const codeFrom = (labels: Record<string, string>, v: string, fallback: string) => {
  const t = normalize(v);
  if (!t) return fallback;
  const hit = Object.entries(labels).find(([k, l]) => normalize(k) === t || normalize(l) === t || normalize(l).startsWith(t));
  return hit ? hit[0] : fallback;
};

const SPECS: Record<Kind, { title: string; columns: string[]; example: Record<string, string>; help: string }> = {
  members: {
    title: 'Students & alumni',
    columns: ['name', 'nameJa', 'program', 'status', 'entryYear', 'graduationYear', 'country', 'researchTopic', 'thesisTitle', 'currentPosition', 'contactEmail', 'bio'],
    example: { name: 'Hinata TANAKA', nameJa: '田中 日向', program: "Master's", status: 'Current', entryYear: '2025', graduationYear: '', country: 'Japan', researchTopic: 'School evacuation planning after the Noto earthquake', thesisTitle: '', currentPosition: '', contactEmail: '', bio: '' },
    help: 'Rows are matched to existing members by name (or Japanese name). Matches are updated; new names are added. Programme: PhD, Master’s, Research student, Exchange, Undergraduate. Status: Current, Alumni, On leave.',
  },
  publications: {
    title: 'Publications',
    columns: ['kind', 'year', 'title', 'authors', 'venue', 'date', 'doi', 'url', 'note', 'peerReviewed', 'invited'],
    example: { kind: 'Paper', year: '2026', title: 'Example title', authors: 'Sakurai, A., Tanaka, H.', venue: 'Journal of Disaster Research, 21(1), 1–10', date: '', doi: '10.20965/jdr.2026.p0001', url: '', note: 'Peer-reviewed', peerReviewed: 'yes', invited: 'no' },
    help: 'Matched by DOI, or by year + title. Kind: Paper, Book, Report, Talk.',
  },
  guests: {
    title: 'Visitors (guest scholars)',
    columns: ['name', 'position', 'affiliation', 'country', 'visitDate', 'note'],
    example: { name: 'Dr. Example Name', position: 'Professor', affiliation: 'Example University', country: 'Japan', visitDate: '2026-05-30', note: 'Guest lecture' },
    help: 'Matched by name + organisation. Dates as YYYY-MM-DD.',
  },
};

export function ImportExport() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const kind = (params.get('type') as Kind) || 'members';
  const spec = SPECS[kind];
  const members = useLiveModel<Member>('Member');
  const profiles = useLiveModel<MemberProfile>('MemberProfile');
  const pubs = useLiveModel<any>('Publication');
  const guests = useLiveModel<any>('Guest');
  const mergedMembers = useMemo(() => mergeMembers(members.items, profiles.items), [members.items, profiles.items]);
  const [rows, setRows] = useState<Row[]>([]);
  const [progress, setProgress] = useState('');
  const [backingUp, setBackingUp] = useState(false);

  const plan = (records: Record<string, string>[]) => {
    const out: Row[] = records.map((r) => {
      const get = (k: string) => (r[k] ?? r[Object.keys(r).find((x) => normalize(x) === normalize(k)) ?? ''] ?? '').trim();
      if (kind === 'members') {
        const name = get('name');
        if (!name) return { data: r, error: 'Missing name', action: 'skip' as const };
        const m = mergedMembers.find((x) => normalize(x.name) === normalize(name) || (get('nameJa') && normalize(x.nameJa) === normalize(get('nameJa'))));
        const data: Record<string, any> = {
          name, nameJa: get('nameJa'), program: codeFrom(PROGRAM_LABELS, get('program'), m?.program ?? 'MASTERS'), status: codeFrom(STATUS_LABELS, get('status'), m?.status ?? 'CURRENT'),
          entryYear: get('entryYear') ? Number(get('entryYear')) : m?.entryYear ?? '', graduationYear: get('graduationYear') ? Number(get('graduationYear')) : m?.graduationYear ?? '',
          visible: m ? m.visible !== false : true, sortOrder: m?.sortOrder ?? 100, slug: m?.slug ?? '',
        };
        for (const k of ['country', 'researchTopic', 'thesisTitle', 'currentPosition', 'contactEmail', 'bio']) if (get(k)) data[k] = get(k);
        return { data, matchId: m?.id, matchLabel: m?.name, action: m ? 'update' : 'create' };
      }
      if (kind === 'publications') {
        const title = get('title');
        const year = Number(get('year'));
        if (!title || !year) return { data: r, error: 'Missing title or year', action: 'skip' as const };
        const doi = get('doi').replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
        const m = pubs.items.find((p) => (doi && p.doi && p.doi.toLowerCase() === doi.toLowerCase()) || (p.year === year && normalize(p.title) === normalize(title)));
        const data = {
          kind: codeFrom({ PAPER: 'Paper', BOOK: 'Book', REPORT: 'Report', TALK: 'Talk' }, get('kind'), 'PAPER'), year, title,
          authors: get('authors') || null, venue: get('venue') || null, date: get('date') || null, doi: doi || null, url: get('url') || null, note: get('note') || null,
          peerReviewed: yes(get('peerReviewed')) || /peer-reviewed/i.test(get('note')), invited: yes(get('invited')),
        };
        return { data, matchId: m?.id, matchLabel: m?.title, action: m ? 'update' : 'create' };
      }
      const name = get('name');
      if (!name) return { data: r, error: 'Missing name', action: 'skip' as const };
      const m = guests.items.find((g) => normalize(g.name) === normalize(name) && normalize(g.affiliation) === normalize(get('affiliation')));
      const data = { name, position: get('position') || null, affiliation: get('affiliation') || null, country: get('country') || 'Japan', visitDate: /^\d{4}-\d{2}-\d{2}$/.test(get('visitDate')) ? get('visitDate') : null, note: get('note') || null };
      return { data, matchId: m?.id, matchLabel: m?.name, action: m ? 'update' : 'create' };
    });
    setRows(out);
  };

  const onFile = async (files: File[]) => {
    const text = await files[0].text();
    const records = parseCsv(text);
    if (!records.length) return toast('The file has no rows. The first row must contain column names.', true);
    plan(records);
  };

  const run = async () => {
    const todo = rows.filter((r) => r.action !== 'skip' && !r.error);
    let failed = 0;
    setProgress(`0 / ${todo.length}`);
    const allMembers = [...members.items];
    await runPool(
      todo,
      async (r) => {
        try {
          if (kind === 'members') {
            const existing = mergedMembers.find((m) => m.id === r.matchId);
            const saved = await saveMember(r.data, allMembers, r.action === 'update' ? existing : undefined);
            if (!existing) allMembers.push(saved);
          } else {
            const model: any = kind === 'publications' ? (userClient.models as any).Publication : (userClient.models as any).Guest;
            if (r.action === 'update') unwrap(await (model as any).update({ id: r.matchId, ...r.data }));
            else unwrap(await (model as any).create(r.data));
          }
        } catch (e) {
          failed++;
          r.error = (e as Error).message;
        }
      },
      kind === 'members' ? 1 : 5,
      (n) => setProgress(`${n} / ${todo.length}`),
    );
    if (kind !== 'members') changed(kind === 'publications' ? 'Publication' : 'Guest', 'import', '', `${todo.length} rows`);
    toast(failed ? `Imported with ${failed} errors — see the table.` : `Imported ${todo.length} rows.`, !!failed);
    setProgress('');
    if (!failed) setRows([]);
    else setRows([...rows]);
  };

  const exportCsv = () => {
    if (kind === 'members') download('members.csv', toCsv(mergedMembers.map((m) => ({ ...m, ...m.profile, program: m.program ? PROGRAM_LABELS[m.program] : '', status: m.status ? STATUS_LABELS[m.status] : '' })), spec.columns), 'text/csv');
    else download(`${kind}.csv`, toCsv(kind === 'publications' ? pubs.items : guests.items, spec.columns), 'text/csv');
  };

  const backup = async () => {
    setBackingUp(true);
    try {
      const names: ModelName[] = ['Member', 'MemberProfile', 'Post', 'Publication', 'Project', 'Award', 'Album', 'Guest', 'SiteContent', 'Submission'];
      const data = Object.fromEntries(await Promise.all(names.map(async (n) => [n, await listAll((userClient.models as any)[n])] as const)));
      download(`sakurai-seminar-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 1), 'application/json');
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBackingUp(false);
    }
  };

  const counts = { create: rows.filter((r) => r.action === 'create' && !r.error).length, update: rows.filter((r) => r.action === 'update' && !r.error).length, error: rows.filter((r) => r.error).length };

  return (
    <>
      <h1>Import & export</h1>
      <p className="muted">Add or update many records at once from a spreadsheet (save it as CSV from Excel or Google Sheets). Every row is matched against existing data first, so importing the same file twice does not create duplicates.</p>
      <div className="tabs">
        {(Object.keys(SPECS) as Kind[]).map((k) => <button key={k} className={kind === k ? 'active' : ''} onClick={() => { setRows([]); setParams({ type: k }); }}>{SPECS[k].title}</button>)}
      </div>
      <div className="panel">
        <div className="spread">
          <h3 style={{ margin: 0 }}>Import {spec.title.toLowerCase()}</h3>
          <div className="row">
            <button className="btn ghost sm" onClick={() => download(`${kind}-template.csv`, toCsv([spec.example], spec.columns), 'text/csv')}>Download template</button>
            <button className="btn ghost sm" onClick={exportCsv}>Export current as CSV</button>
          </div>
        </div>
        <p className="small muted">{spec.help} Columns: <code>{spec.columns.join(', ')}</code></p>
        {members.loading || pubs.loading || guests.loading ? <Loading /> : <DropZone onFiles={onFile} accept=".csv,text/csv" multiple={false}>Drop a CSV file here or <u>choose a file</u></DropZone>}
        {rows.length > 0 && (
          <>
            <div className="row" style={{ margin: '16px 0 10px' }}>
              <span className="tag ok">{counts.create} new</span>
              <span className="tag gold">{counts.update} will update existing</span>
              {counts.error > 0 && <span className="tag danger">{counts.error} with problems</span>}
              <span className="grow" />
              <button className="btn secondary sm" onClick={() => setRows([])}>Cancel</button>
              <button className="btn" disabled={!!progress || !(counts.create + counts.update)} onClick={run}>{progress ? `Importing ${progress}…` : `Import ${counts.create + counts.update} rows`}</button>
            </div>
            <div className="table-wrap" style={{ maxHeight: 460, overflowY: 'auto' }}>
              <table className="data">
                <thead><tr><th>#</th><th>Row</th><th>Matches</th><th>Action</th></tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td className="small muted">{i + 2}</td>
                      <td className="small"><b>{r.data.name ?? r.data.title}</b> {r.data.year ?? ''} {r.data.affiliation ?? ''}</td>
                      <td className="small">{r.matchLabel ?? <span className="muted">—</span>}</td>
                      <td>
                        {r.error ? <span className="tag danger" title={r.error}>{r.error}</span> : (
                          <select className="input" style={{ width: 'auto', padding: '3px 6px' }} value={r.action} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, action: e.target.value as Row['action'] } : x)))}>
                            {r.matchId && <option value="update">Update existing</option>}
                            <option value="create">Add as new</option>
                            <option value="skip">Skip</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <div className="panel">
        <h3>Full backup</h3>
        <p className="small muted">Download every record (members, profiles, posts, publications, projects, awards, albums, visitors, page text) as one JSON file. Uploaded files stay in Amazon S3.</p>
        <button className="btn secondary" disabled={backingUp} onClick={backup}>{backingUp ? 'Preparing…' : 'Download backup'}</button>
      </div>
    </>
  );
}

export function ActivityLog() {
  const { items, loading } = useLiveModel<AuditLog>('AuditLog');
  const [q, setQ] = useState('');
  const shown = [...items]
    .filter((l) => !q || normalize([l.actor, l.action, l.entity, l.label].join(' ')).includes(normalize(q)))
    .sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''));
  return (
    <>
      <div className="spread"><h1 style={{ margin: 0 }}>Activity log</h1><input className="input" style={{ width: 240 }} placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <p className="muted">Every change made through the admin console and the student portal.</p>
      {loading ? <Loading /> : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>What</th></tr></thead>
            <tbody>
              {shown.slice(0, 500).map((l) => (
                <tr key={l.id}>
                  <td className="small">{formatDate(l.at, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="small">{l.actor}</td>
                  <td><span className="tag grey">{l.action}</span> <span className="small">{l.entity}</span></td>
                  <td className="small">{l.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
