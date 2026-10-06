/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import { parseJson, userClient, unwrap, type Album, type Member, type MemberProfile, type Post } from '../../lib/amplify';
import { changed } from '../../lib/audit';
import { academicYear, ALBUM_CATEGORIES, normalize, slugify, today, uniqueSlug } from '../../lib/format';
import { mergeMembers, type MemberView } from '../../lib/members';
import { uploads, useOtherTabUploads, useUploads } from '../../lib/uploads';
import type { UploadResult } from '../../lib/files';
import { DropZone, Field, UploadList } from '../../components/fields';
import { Img, useToast } from '../../components/ui';
import { useLiveModel } from './crud';

type JobKind = 'album' | 'memberPhotos' | 'memberCv' | 'postPhotos';
type Job = { id: string; kind: JobKind; title: string };

const KIND_INFO: Record<JobKind, { label: string; help: string; accept: string; folder: string }> = {
  album: { label: 'Photos → gallery album', help: 'Add any number of photos to an existing album or a new one.', accept: 'image/*', folder: 'gallery' },
  memberPhotos: { label: 'Student portraits (auto-match)', help: 'Name each file after the student (e.g. “Hinata Tanaka.jpg” or “tanaka_hinata.png”). Files are matched to members automatically; check the matches, then apply.', accept: 'image/*', folder: 'members' },
  memberCv: { label: 'Student CVs (auto-match)', help: 'PDF files named after each student are matched and attached as their CV.', accept: 'application/pdf', folder: 'members' },
  postPhotos: { label: 'Photos → news post', help: 'Add a photo gallery to an existing news or event post.', accept: 'image/*', folder: 'news' },
};

/** Scores how well a file name matches a member's name (0–1). */
export function matchScore(fileName: string, m: Member): number {
  const base = normalize(fileName.replace(/\.[^.]+$/, '').replace(/[_.\-]+/g, ' ').replace(/\d+/g, ' '));
  if (!base) return 0;
  if (base.replace(/ /g, '') === normalize(m.slug).replace(/ /g, '')) return 1;
  if (m.nameJa && base.replace(/ /g, '').includes(normalize(m.nameJa).replace(/ /g, ''))) return 1;
  const fileTokens = new Set(base.split(' ').filter((t) => t.length > 1));
  const nameTokens = normalize(m.name).split(' ').filter((t) => t.length > 1);
  if (!nameTokens.length || !fileTokens.size) return 0;
  const hits = nameTokens.filter((t) => fileTokens.has(t)).length;
  return hits / Math.max(nameTokens.length, fileTokens.size);
}

export function bestMatch(fileName: string, members: Member[]): { member?: Member; score: number } {
  let best: { member?: Member; score: number } = { score: 0 };
  for (const m of members) {
    const s = matchScore(fileName, m);
    if (s > best.score) best = { member: m, score: s };
  }
  return best.score >= 0.5 ? best : { score: best.score };
}

function AlbumJob({ job, albums }: { job: Job; albums: Album[] }) {
  const toast = useToast();
  const items = useUploads(job.id);
  const [albumId, setAlbumId] = useState(albums[0]?.id ?? 'NEW');
  const [newAlbum, setNewAlbum] = useState({ title: '', category: 'Seminar', date: today() });

  const ensureAlbum = async (): Promise<string> => {
    if (albumId !== 'NEW') return albumId;
    if (!newAlbum.title.trim()) throw new Error('Give the new album a title first.');
    const created = unwrap<any>(
      await userClient.models.Album.create({
        title: newAlbum.title,
        slug: uniqueSlug(slugify(newAlbum.title), albums.map((a) => a.slug)),
        category: newAlbum.category,
        date: newAlbum.date,
        academicYear: academicYear(newAlbum.date),
        photos: '[]',
        published: true,
      }),
    );
    changed('Album', 'create', created.id, created.title);
    setAlbumId(created.id);
    return created.id;
  };

  const add = async (files: File[]) => {
    try {
      const id = await ensureAlbum();
      const results = await uploads.add(files, { area: 'site', folder: 'gallery' }, job.id);
      const ok = results.filter((r): r is UploadResult => !!r);
      // Re-read the album just before saving, so photos added from other tabs are kept.
      const latest = unwrap<any>(await userClient.models.Album.get({ id }));
      const existing = parseJson<{ key: string; caption?: string }[]>(latest?.photos, []);
      const keys = new Set(existing.map((p) => p.key));
      const merged = [...existing, ...ok.filter((r) => !keys.has(r.key)).map((r) => ({ key: r.key, caption: '' }))];
      unwrap(await userClient.models.Album.update({ id, photos: JSON.stringify(merged) }));
      changed('Album', 'add-photos', id, `${latest?.title} (+${merged.length - existing.length})`);
      toast(`${merged.length - existing.length} photos added to “${latest?.title}”${ok.length - (merged.length - existing.length) ? ` (${ok.length - (merged.length - existing.length)} already there)` : ''}.`);
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  return (
    <div className="form">
      <Field label="Album">
        <select value={albumId} onChange={(e) => setAlbumId(e.target.value)}>
          <option value="NEW">+ New album…</option>
          {albums.map((a) => <option key={a.id} value={a.id}>{a.title}{a.academicYear ? ` (AY ${a.academicYear})` : ''}</option>)}
        </select>
      </Field>
      {albumId === 'NEW' && (
        <div className="grid2">
          <Field label="New album title"><input type="text" placeholder="e.g. Internship AY 2025" value={newAlbum.title} onChange={(e) => setNewAlbum({ ...newAlbum, title: e.target.value })} /></Field>
          <div className="grid2">
            <Field label="Category"><select value={newAlbum.category} onChange={(e) => setNewAlbum({ ...newAlbum, category: e.target.value })}>{ALBUM_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Date"><input type="date" value={newAlbum.date} onChange={(e) => setNewAlbum({ ...newAlbum, date: e.target.value })} /></Field>
          </div>
        </div>
      )}
      <DropZone onFiles={add} accept="image/*">Drop photos here — as many as you like — or <u>choose files</u></DropZone>
      <UploadList items={items} />
    </div>
  );
}

function PostJob({ job, posts }: { job: Job; posts: Post[] }) {
  const toast = useToast();
  const items = useUploads(job.id);
  const sorted = [...posts].sort((a, b) => (b.publishDate ?? '').localeCompare(a.publishDate ?? ''));
  const [postId, setPostId] = useState(sorted[0]?.id ?? '');
  const add = async (files: File[]) => {
    if (!postId) return toast('Choose a post first.', true);
    const results = await uploads.add(files, { area: 'site', folder: 'news' }, job.id);
    try {
      const latest = unwrap<any>(await userClient.models.Post.get({ id: postId }));
      const existing: string[] = (latest?.imageKeys ?? []).filter(Boolean);
      const merged = [...new Set([...existing, ...results.filter((r): r is UploadResult => !!r).map((r) => r.key)])];
      unwrap(await userClient.models.Post.update({ id: postId, imageKeys: merged, coverKey: latest?.coverKey ?? merged[0] ?? null }));
      changed('Post', 'add-photos', postId, latest?.title ?? '');
      toast(`${merged.length - existing.length} photos added to “${latest?.title}”.`);
    } catch (e) {
      toast((e as Error).message, true);
    }
  };
  return (
    <div className="form">
      <Field label="Post">
        <select value={postId} onChange={(e) => setPostId(e.target.value)}>
          {sorted.map((p) => <option key={p.id} value={p.id}>{p.publishDate} · {p.title}</option>)}
        </select>
      </Field>
      <DropZone onFiles={add} accept="image/*" />
      <UploadList items={items} />
    </div>
  );
}

type Matched = { result: UploadResult; memberId?: string; score: number };

function MemberJob({ job, members, onApplied }: { job: Job; members: MemberView[]; onApplied: () => void }) {
  const toast = useToast();
  const items = useUploads(job.id);
  const [rows, setRows] = useState<Matched[]>([]);
  const [applying, setApplying] = useState(false);
  const isCv = job.kind === 'memberCv';

  const add = async (files: File[]) => {
    const results = await uploads.add(files, { area: 'site', folder: isCv ? 'members/cv' : 'members/photos' }, job.id);
    setRows((r) => [
      ...r,
      ...results.flatMap((result, i) => {
        if (!result) return [];
        const m = bestMatch(files[i].name, members);
        return [{ result, memberId: m.member?.id, score: m.score }];
      }),
    ]);
  };

  const apply = async () => {
    setApplying(true);
    let n = 0;
    try {
      for (const r of rows.filter((x) => x.memberId)) {
        const m = members.find((x) => x.id === r.memberId)!;
        const field = isCv ? { cvKey: r.result.key } : { photoKey: r.result.key };
        if (m.profile) unwrap(await userClient.models.MemberProfile.update({ id: m.id, ...field }));
        else unwrap(await userClient.models.MemberProfile.create({ id: m.id, ownerId: m.ownerId ?? null, ...field }));
        n++;
      }
      changed('MemberProfile', isCv ? 'bulk-cv' : 'bulk-photos', '', `${n} members`);
      toast(`${isCv ? 'CVs' : 'Photos'} applied to ${n} members.`);
      setRows([]);
      uploads.clearFinished(job.id);
      onApplied();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setApplying(false);
    }
  };

  const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="form">
      <DropZone onFiles={add} accept={isCv ? 'application/pdf' : 'image/*'}>Drop {isCv ? 'PDF CVs' : 'portraits'} named after the students, or <u>choose files</u></DropZone>
      <UploadList items={items.filter((i) => i.state !== 'done' && i.state !== 'duplicate')} />
      {rows.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="data">
              <thead><tr>{!isCv && <th style={{ width: 70 }} />}<th>File</th><th>Matched member</th><th>Confidence</th><th /></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.result.key + i}>
                    {!isCv && <td><div style={{ width: 52, height: 64, overflow: 'hidden', borderRadius: 3 }}><Img k={r.result.key} alt="" /></div></td>}
                    <td className="small">{r.result.name}</td>
                    <td>
                      <select className="input" value={r.memberId ?? ''} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, memberId: e.target.value || undefined } : x)))}>
                        <option value="">— skip —</option>
                        {sorted.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </td>
                    <td>{r.memberId ? (r.score >= 0.99 ? <span className="tag ok">Exact</span> : r.score >= 0.5 ? <span className="tag gold">Likely</span> : <span className="tag grey">Manual</span>) : <span className="tag danger">No match</span>}</td>
                    <td className="actions"><button className="btn ghost sm" onClick={() => setRows(rows.filter((_, j) => j !== i))}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row">
            <button className="btn" disabled={applying || !rows.some((r) => r.memberId)} onClick={apply}>
              {applying ? 'Applying…' : `Apply to ${rows.filter((r) => r.memberId).length} members`}
            </button>
            {new Set(rows.map((r) => r.memberId).filter(Boolean)).size < rows.filter((r) => r.memberId).length && <span className="small" style={{ color: 'var(--danger)' }}>Two files are matched to the same member — the last one wins.</span>}
          </div>
        </>
      )}
    </div>
  );
}

export function UploadCenter() {
  const albums = useLiveModel<Album>('Album');
  const posts = useLiveModel<Post>('Post');
  const members = useLiveModel<Member>('Member');
  const profiles = useLiveModel<MemberProfile>('MemberProfile');
  const merged = useMemo(() => mergeMembers(members.items, profiles.items), [members.items, profiles.items]);
  const all = useUploads();
  const others = useOtherTabUploads();
  const [jobs, setJobs] = useState<Job[]>([{ id: 'job-1', kind: 'album', title: 'Upload 1' }]);
  const [active, setActive] = useState('job-1');
  const [newKind, setNewKind] = useState<JobKind>('album');

  const running = all.filter((i) => i.state === 'uploading').length;
  const queued = all.filter((i) => i.state === 'queued').length;
  const addJob = () => {
    const id = `job-${Date.now()}`;
    setJobs([...jobs, { id, kind: newKind, title: `Upload ${jobs.length + 1}` }]);
    setActive(id);
  };
  const closeJob = (id: string) => {
    const busy = all.some((i) => i.batch === id && (i.state === 'uploading' || i.state === 'queued'));
    if (busy && !confirm('Uploads in this job are still running. Close the tab anyway? (They keep uploading in the background.)')) return;
    const rest = jobs.filter((j) => j.id !== id);
    setJobs(rest);
    if (active === id) setActive(rest[0]?.id ?? '');
  };
  const job = jobs.find((j) => j.id === active);

  return (
    <>
      <h1>Upload center</h1>
      <p className="muted">
        Upload many files at once. Open several upload jobs in the tabs below — or open this page in more browser tabs — and they all run in parallel.
        Identical files are recognised and stored only once; large photos are resized automatically.
      </p>
      <div className="stats" style={{ marginBottom: 18 }}>
        <div className="stat"><b>{running}</b><span>Uploading now</span></div>
        <div className="stat"><b>{queued}</b><span>Waiting</span></div>
        <div className="stat"><b>{all.filter((i) => i.state === 'done').length}</b><span>Uploaded</span></div>
        <div className="stat"><b>{all.filter((i) => i.state === 'duplicate').length}</b><span>Duplicates skipped</span></div>
        <div className="stat"><b>{all.filter((i) => i.state === 'error').length}</b><span>Failed</span></div>
      </div>

      <div className="tabs">
        {jobs.map((j) => {
          const n = all.filter((i) => i.batch === j.id && (i.state === 'uploading' || i.state === 'queued')).length;
          return (
            <button key={j.id} className={active === j.id ? 'active' : ''} onClick={() => setActive(j.id)}>
              {j.title}: {KIND_INFO[j.kind].label.split(' (')[0]} {n > 0 && <span className="spinner" style={{ width: 12, height: 12 }} />}
              <span className="x" onClick={(e) => { e.stopPropagation(); closeJob(j.id); }} aria-label="Close tab">✕</span>
            </button>
          );
        })}
        <span className="row" style={{ marginLeft: 'auto', gap: 6 }}>
          <select className="input" style={{ width: 'auto', padding: '5px 8px' }} value={newKind} onChange={(e) => setNewKind(e.target.value as JobKind)}>
            {Object.entries(KIND_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button className="btn secondary sm" onClick={addJob}>+ New upload tab</button>
        </span>
      </div>

      {jobs.map((j) => (
        <div key={j.id} className="panel" hidden={j.id !== job?.id}>
          <h3>{KIND_INFO[j.kind].label}</h3>
          <p className="small muted">{KIND_INFO[j.kind].help}</p>
          {j.kind === 'album' && <AlbumJob job={j} albums={albums.items} />}
          {j.kind === 'postPhotos' && <PostJob job={j} posts={posts.items} />}
          {(j.kind === 'memberPhotos' || j.kind === 'memberCv') && <MemberJob job={j} members={merged} onApplied={profiles.reload} />}
        </div>
      ))}
      {!jobs.length && <div className="empty">Open a new upload tab to start.</div>}

      {Object.keys(others).length > 0 && (
        <div className="panel">
          <h3>Uploads running in your other browser tabs</h3>
          {Object.entries(others).map(([tab, info]) => {
            const active = info.items.filter((i) => i.state === 'uploading' || i.state === 'queued');
            const done = info.items.filter((i) => i.state === 'done' || i.state === 'duplicate').length;
            const pct = info.items.length ? Math.round((info.items.reduce((s, i) => s + i.progress, 0) / info.items.length) * 100) : 0;
            return (
              <div key={tab} className="small" style={{ marginBottom: 10 }}>
                <div className="spread"><span>Tab {tab} — {done}/{info.items.length} finished{active.length ? `, ${active.length} in progress` : ''}</span><span>{pct}%</span></div>
                <div className={'progress' + (pct === 100 ? ' done' : '')}><i style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
