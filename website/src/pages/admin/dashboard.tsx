/* eslint-disable @typescript-eslint/no-explicit-any */
import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import starter from '../../seed/starter.json';
import { listAll, parseJson, userClient, unwrap, type AuditLog, type ModelName, type Submission, type VisitStat } from '../../lib/amplify';
import { useAuth } from '../../lib/auth';
import { changed } from '../../lib/audit';
import { DEFAULTS } from '../../lib/defaults';
import { CATEGORY_LABELS, formatDate, normalize, slugify, uniqueSlug } from '../../lib/format';
import { FileLink, Loading, PhotoGrid, useToast } from '../../components/ui';
import { Drawer, useLiveModel } from './crud';

/** Runs async jobs a few at a time. */
export async function runPool<T>(items: T[], worker: (item: T, i: number) => Promise<void>, size = 5, onTick?: (done: number) => void) {
  let next = 0;
  let done = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        await worker(items[i], i);
        onTick?.(++done);
      }
    }),
  );
}

/** Saves the old website's content (publications, projects, awards, page text) into the database, skipping anything already there. */
async function importStarter(onProgress: (msg: string) => void) {
  const m = userClient.models;
  const [pubs, projects, awards, content] = await Promise.all([
    listAll<any>(m.Publication),
    listAll<any>(m.Project),
    listAll<any>(m.Award),
    listAll<any>(m.SiteContent),
  ]);
  const pubKeys = new Set(pubs.map((p) => `${p.year}|${normalize(p.title)}`));
  const newPubs = starter.publications.filter((p) => !pubKeys.has(`${p.year}|${normalize(p.title)}`));
  const projKeys = new Set(projects.map((p) => normalize(p.titleEn)));
  const newProjects = starter.projects.filter((p) => !projKeys.has(normalize(p.titleEn)));
  const awardKeys = new Set(awards.map((a) => normalize(a.title + a.date)));
  const newAwards = starter.awards.filter((a) => !awardKeys.has(normalize(a.title + a.date)));
  const contentIds = new Set(content.map((c) => c.id));
  const newBlocks = (Object.keys(DEFAULTS) as (keyof typeof DEFAULTS)[]).filter((k) => !contentIds.has(k));

  let total = 0;
  const tick = () => onProgress(`Saved ${++total} of ${newPubs.length + newProjects.length + newAwards.length + newBlocks.length} records…`);
  await runPool(newPubs, async (p) => { unwrap(await m.Publication.create({ ...p, kind: p.kind as any, doi: p.doi || null, date: p.date || null, note: p.note || null })); tick(); });
  await runPool(newProjects, async (p) => { unwrap(await m.Project.create({ ...p, host: p.host || null })); tick(); });
  await runPool(newAwards, async (a) => { unwrap(await m.Award.create({ ...a, year: a.year ?? null })); tick(); });
  await runPool(newBlocks, async (k) => { unwrap(await m.SiteContent.create({ id: k, data: JSON.stringify(DEFAULTS[k]) })); tick(); });
  (['Publication', 'Project', 'Award', 'SiteContent'] as ModelName[]).forEach((x) => changed(x, 'import', 'starter', 'Starter content'));
  return { pubs: newPubs.length, projects: newProjects.length, awards: newAwards.length, blocks: newBlocks.length };
}

function VisitsChart({ stats }: { stats: VisitStat[] }) {
  const days = useMemo(() => {
    const byDay = new Map(stats.map((s) => [s.id, s.count ?? 0]));
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.now() - (29 - i) * 86400000);
      const id = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(d);
      return { id, n: byDay.get(id) ?? 0 };
    });
  }, [stats]);
  const max = Math.max(1, ...days.map((d) => d.n));
  return (
    <>
      <div className="bars" aria-label="Visits in the last 30 days">
        {days.map((d) => <div key={d.id} style={{ height: `${(d.n / max) * 100}%` }} title={`${d.id}: ${d.n} visits`} />)}
      </div>
      <div className="spread small muted"><span>{days[0].id}</span><span>today</span></div>
    </>
  );
}

export function Dashboard() {
  const toast = useToast();
  const auth = useAuth();
  const members = useLiveModel<any>('Member');
  const posts = useLiveModel<any>('Post');
  const pubs = useLiveModel<any>('Publication');
  const subs = useLiveModel<Submission>('Submission');
  const visits = useLiveModel<VisitStat>('VisitStat');
  const log = useLiveModel<AuditLog>('AuditLog');
  const content = useLiveModel<any>('SiteContent');
  const [importing, setImporting] = useState('');

  const pending = subs.items.filter((s) => s.status === 'PENDING');
  const total = visits.items.find((v) => v.id === 'total')?.count ?? 0;
  const todayId = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());
  const todayCount = visits.items.find((v) => v.id === todayId)?.count ?? 0;
  const last30 = visits.items.filter((v) => v.id !== 'total' && v.id >= new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)).reduce((s, v) => s + (v.count ?? 0), 0);
  const needsStarter = !pubs.loading && !content.loading && (pubs.items.length === 0 || content.items.length === 0);

  const runImport = async () => {
    setImporting('Starting…');
    try {
      const r = await importStarter(setImporting);
      toast(`Imported ${r.pubs} publications, ${r.projects} projects, ${r.awards} awards and ${r.blocks} page blocks.`);
      pubs.reload();
      content.reload();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setImporting('');
    }
  };

  return (
    <>
      <h1>Dashboard</h1>
      <p className="muted">Welcome{auth.name ? `, ${auth.name}` : ''}. You are signed in as <b>{auth.groups.join(', ') || 'member'}</b>.</p>

      {needsStarter && (
        <div className="alert warn" style={{ marginBottom: 20 }}>
          <b>First-time setup.</b> Import the content from the previous website — 157 publications, 14 funded projects, 4 awards, Prof. Sakurai’s career, education, research themes, courses and links — so you can edit it here.{' '}
          <button className="btn sm" disabled={!!importing} onClick={runImport}>{importing || 'Import starter content'}</button>
        </div>
      )}

      <div className="stats" style={{ marginBottom: 20 }}>
        <div className="stat"><b>{total.toLocaleString()}</b><span>Visits (all time)</span></div>
        <div className="stat"><b>{last30.toLocaleString()}</b><span>Last 30 days</span></div>
        <div className="stat"><b>{todayCount}</b><span>Today</span></div>
        <div className="stat"><b>{members.items.filter((m) => m.status !== 'ALUMNI').length}</b><span>Current members</span></div>
        <div className="stat"><b>{posts.items.filter((p) => p.published).length}</b><span>Published posts</span></div>
        <div className="stat"><b>{pubs.items.length}</b><span>Publications</span></div>
      </div>

      <div className="grid c2">
        <div className="panel">
          <div className="spread"><h3 style={{ margin: 0 }}>Waiting for approval</h3><Link to="/admin/submissions">Review all →</Link></div>
          {subs.loading ? <Loading /> : pending.length ? (
            <ul className="pub-list">
              {pending.slice(0, 6).map((s) => (
                <li key={s.id} className="pub" style={{ gridTemplateColumns: '90px 1fr' }}>
                  <span className="tag gold">{s.kind === 'POST' ? CATEGORY_LABELS[parseJson<any>(s.payload, {}).category] ?? 'Post' : 'Publication'}</span>
                  <div><div className="t">{s.title}</div><div className="n">{s.submitterName} · {formatDate(s.createdAt)}</div></div>
                </li>
              ))}
            </ul>
          ) : <p className="muted small" style={{ marginTop: 12 }}>Nothing waiting. Students’ news and publications appear here.</p>}
        </div>
        <div className="panel">
          <h3>Visits — last 30 days</h3>
          {visits.loading ? <Loading /> : <VisitsChart stats={visits.items} />}
          <p className="small muted" style={{ marginTop: 8 }}>One visit = one browser session. Days are counted in Japan time.</p>
        </div>
      </div>

      <div className="grid c2" style={{ marginTop: 20 }}>
        <div className="panel">
          <h3>Quick actions</h3>
          <div className="row">
            <Link className="btn" to="/admin/posts">Write news</Link>
            <Link className="btn secondary" to="/admin/members">Add a student</Link>
            <Link className="btn secondary" to="/admin/uploads">Bulk upload</Link>
            <Link className="btn secondary" to="/admin/content">Edit cover page</Link>
            <Link className="btn secondary" to="/admin/gallery">New album</Link>
          </div>
          {!needsStarter && (
            <p className="small muted" style={{ marginTop: 14 }}>
              Re-import missing starter content: <button className="btn ghost sm" disabled={!!importing} onClick={runImport}>{importing || 'Import (skips existing)'}</button>
            </p>
          )}
        </div>
        <div className="panel">
          <div className="spread"><h3 style={{ margin: 0 }}>Recent activity</h3><Link to="/admin/activity">Full log →</Link></div>
          <ul className="pub-list">
            {[...log.items].sort((a, b) => (b.at ?? '').localeCompare(a.at ?? '')).slice(0, 8).map((l) => (
              <li key={l.id} className="small" style={{ padding: '6px 0', borderBottom: '1px solid var(--line-2)' }}>
                <b>{l.actor || 'someone'}</b> {l.action} {l.entity} <i>{l.label}</i> <span className="muted">· {formatDate(l.at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

export function SubmissionsAdmin() {
  const toast = useToast();
  const { items, loading, reload } = useLiveModel<Submission>('Submission');
  const posts = useLiveModel<any>('Post');
  const [status, setStatus] = useState('PENDING');
  const [open, setOpen] = useState<Submission | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const shown = items.filter((s) => status === 'ALL' || s.status === status).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

  const approve = async (s: Submission) => {
    setBusy(true);
    try {
      const p = parseJson<any>(s.payload, {});
      let resultId = '';
      if (s.kind === 'POST') {
        const slug = uniqueSlug(slugify(p.title ?? s.title), posts.items.map((x) => x.slug));
        const created = unwrap<any>(
          await userClient.models.Post.create({
            slug,
            title: p.title ?? s.title,
            category: p.category ?? 'STUDENT_ACTIVITY',
            excerpt: p.excerpt || null,
            body: p.body || null,
            eventDate: p.eventDate || null,
            publishDate: new Date().toISOString().slice(0, 10),
            location: p.location || null,
            authorName: p.authorName || s.submitterName,
            imageKeys: p.imageKeys ?? [],
            coverKey: p.imageKeys?.[0] ?? null,
            memberIds: p.memberIds ?? [],
            published: true,
          }),
        );
        resultId = created.id;
        changed('Post', 'approve', created.id, created.title);
      } else {
        const created = unwrap<any>(
          await userClient.models.Publication.create({
            kind: p.kind ?? 'PAPER',
            year: Number(p.year) || new Date().getFullYear(),
            title: p.title ?? s.title,
            authors: p.authors || null,
            venue: p.venue || null,
            doi: p.doi || null,
            url: p.url || null,
            note: p.note || null,
            peerReviewed: !!p.peerReviewed,
            pdfKey: p.pdfKey || null,
            memberIds: p.memberIds ?? [],
          }),
        );
        resultId = created.id;
        changed('Publication', 'approve', created.id, created.title);
      }
      unwrap(await userClient.models.Submission.update({ id: s.id, status: 'APPROVED', resultId, reviewNote: note || null }));
      changed('Submission', 'approve', s.id, s.title);
      toast(s.kind === 'POST' ? 'Published to News & Events. You can still edit it there.' : 'Added to Publications.');
      setOpen(null);
      reload();
      posts.reload();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  const ret = async (s: Submission) => {
    if (!note.trim()) return toast('Add a short note so the student knows what to change.', true);
    setBusy(true);
    try {
      unwrap(await userClient.models.Submission.update({ id: s.id, status: 'RETURNED', reviewNote: note }));
      changed('Submission', 'return', s.id, s.title);
      toast('Returned to the student with your note.');
      setOpen(null);
      reload();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  const p = open ? parseJson<any>(open.payload, {}) : {};
  return (
    <>
      <h1>Submissions</h1>
      <p className="muted">News, activity reports and publications sent by students. Approving publishes them; returning sends your note back.</p>
      <div className="chips" style={{ margin: '14px 0' }}>
        {[['PENDING', 'Waiting'], ['APPROVED', 'Approved'], ['RETURNED', 'Returned'], ['ALL', 'All']].map(([k, l]) => (
          <button key={k} className={'chip' + (status === k ? ' active' : '')} onClick={() => setStatus(k)}>{l}<span className="n">{k === 'ALL' ? items.length : items.filter((s) => s.status === k).length}</span></button>
        ))}
      </div>
      {loading ? <Loading /> : shown.length ? (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Sent</th><th>From</th><th>Type</th><th>Title</th><th>Status</th><th /></tr></thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.id}>
                  <td className="small">{formatDate(s.createdAt)}</td>
                  <td className="small">{s.submitterName}</td>
                  <td className="small">{s.kind === 'POST' ? CATEGORY_LABELS[parseJson<any>(s.payload, {}).category] ?? 'Post' : 'Publication'}</td>
                  <td><b>{s.title}</b></td>
                  <td>{s.status === 'APPROVED' ? <span className="tag ok">Approved</span> : s.status === 'RETURNED' ? <span className="tag danger">Returned</span> : <span className="tag gold">Waiting</span>}</td>
                  <td className="actions"><button className="btn ghost sm" onClick={() => { setOpen(s); setNote(s.reviewNote ?? ''); }}>Review</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="empty">Nothing here.</div>}

      {open && (
        <Drawer
          title={open.title}
          onClose={() => setOpen(null)}
          footer={open.status === 'PENDING' ? (
            <>
              <button className="btn danger" disabled={busy} onClick={() => ret(open)}>Return with note</button>
              <button className="btn" disabled={busy} onClick={() => approve(open)}>{busy ? 'Working…' : 'Approve & publish'}</button>
            </>
          ) : undefined}
        >
          <p className="muted small">From {open.submitterName} · {formatDate(open.createdAt)}</p>
          <dl className="kv">
            {Object.entries(p).filter(([k, v]) => v && !['imageKeys', 'memberIds', 'body', 'images', 'pdfKey'].includes(k)).map(([k, v]) => (
              <Fragment key={k}><dt>{k}</dt><dd>{String(v)}</dd></Fragment>
            ))}
          </dl>
          {p.body && <><h3 style={{ marginTop: 20 }}>Text</h3><div className="panel"><pre style={{ whiteSpace: 'pre-wrap', margin: 0, font: 'inherit' }}>{p.body}</pre></div></>}
          {open.attachmentKeys?.length ? (
            <><h3 style={{ marginTop: 20 }}>Attachments ({open.attachmentKeys.length})</h3><AttachmentGrid keys={open.attachmentKeys.filter(Boolean) as string[]} /></>
          ) : null}
          <div className="field" style={{ marginTop: 20 }}>
            <label>Note to the student</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional when approving; required when returning." />
          </div>
        </Drawer>
      )}
    </>
  );
}

function AttachmentGrid({ keys }: { keys: string[] }) {
  const images = keys.filter((k) => /\.(jpe?g|png|webp|gif)$/i.test(k));
  const docs = keys.filter((k) => !images.includes(k));
  return (
    <>
      {images.length > 0 && <PhotoGrid photos={images.map((key) => ({ key }))} />}
      {docs.map((k) => <div key={k}><FileLink k={k}>{k.split('/').pop()}</FileLink></div>)}
    </>
  );
}
