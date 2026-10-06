import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAll, parseJson, userClient, unwrap, type Submission } from '../../lib/amplify';
import { useAuth } from '../../lib/auth';
import { changed } from '../../lib/audit';
import { CATEGORY_LABELS, formatDate, KIND_SINGULAR, PROGRAM_LABELS, today } from '../../lib/format';
import { useMembers, type MemberView } from '../../lib/members';
import { useAsync } from '../../lib/store';
import { Field, FileField, LinksField, MultiFileField, type LinkRow, type Photo } from '../../components/fields';
import { Loading, PageHeader, useToast } from '../../components/ui';

type Tab = 'profile' | 'post' | 'publication' | 'submissions';

function ProfileForm({ member }: { member: MemberView }) {
  const toast = useToast();
  const auth = useAuth();
  const p = member.profile;
  const [form, setForm] = useState(() => ({
    researchTopic: p?.researchTopic ?? '',
    researchTopicJa: p?.researchTopicJa ?? '',
    bio: p?.bio ?? '',
    bioJa: p?.bioJa ?? '',
    country: p?.country ?? '',
    thesisTitle: p?.thesisTitle ?? '',
    currentPosition: p?.currentPosition ?? '',
    contactEmail: p?.contactEmail ?? '',
    interests: (p?.interests ?? []).join(', '),
    photoKey: p?.photoKey ?? null,
    cvKey: p?.cvKey ?? null,
    links: member.links as LinkRow[],
    documents: member.documents.map((d) => ({ key: d.key, caption: d.title })) as Photo[],
  }));
  const [loadedAt] = useState(p?.updatedAt);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const fields = {
        researchTopic: form.researchTopic || null,
        researchTopicJa: form.researchTopicJa || null,
        bio: form.bio || null,
        bioJa: form.bioJa || null,
        country: form.country || null,
        thesisTitle: form.thesisTitle || null,
        currentPosition: form.currentPosition || null,
        contactEmail: form.contactEmail || null,
        interests: form.interests.split(',').map((s) => s.trim()).filter(Boolean),
        photoKey: form.photoKey,
        cvKey: form.cvKey,
        links: JSON.stringify(form.links.filter((l) => l.url)),
        documents: JSON.stringify(form.documents.map((d) => ({ key: d.key, title: d.caption ?? '' }))),
      };
      if (p) {
        const latest = unwrap(await userClient.models.MemberProfile.get({ id: p.id }));
        if (latest && loadedAt && latest.updatedAt !== loadedAt && !confirm('Your profile was changed somewhere else (another tab or an administrator) after you opened it. Save your version anyway?')) {
          return;
        }
        unwrap(await userClient.models.MemberProfile.update({ id: p.id, ...fields }));
      } else {
        unwrap(await userClient.models.MemberProfile.create({ id: member.id, ownerId: auth.sub, ...fields }));
      }
      changed('MemberProfile', 'update', member.id, `${member.name} (own profile)`);
      toast('Profile saved — it is live on the Students page.');
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="form">
      <div className="alert info">
        Name, programme and year are kept by the seminar office ({member.program ? PROGRAM_LABELS[member.program] : '—'}, {member.entryYear ?? '—'}). Ask an administrator if they need changing.
        Everything below is yours to edit and appears on <Link to={`/members/${member.slug}`}>your public page</Link>.
      </div>
      <div className="grid2">
        <FileField label="Profile photo" value={form.photoKey} onChange={(k) => set('photoKey', k)} target={{ area: 'members' }} hint="A portrait, ideally 4:5. Large photos are resized automatically." />
        <FileField label="CV (PDF)" value={form.cvKey} onChange={(k) => set('cvKey', k)} target={{ area: 'members' }} accept="application/pdf" image={false} />
      </div>
      <div className="grid2">
        <Field label="Research topic (English)"><input type="text" value={form.researchTopic} onChange={(e) => set('researchTopic', e.target.value)} /></Field>
        <Field label="Research topic (日本語)"><input type="text" value={form.researchTopicJa} onChange={(e) => set('researchTopicJa', e.target.value)} /></Field>
      </div>
      <Field label="About you (English)" hint="Background, research and fieldwork. Separate paragraphs with a blank line."><textarea value={form.bio} onChange={(e) => set('bio', e.target.value)} /></Field>
      <Field label="About you (日本語, optional)"><textarea value={form.bioJa} onChange={(e) => set('bioJa', e.target.value)} /></Field>
      <div className="grid2">
        <Field label="Country or region"><input type="text" value={form.country} onChange={(e) => set('country', e.target.value)} /></Field>
        <Field label="Public contact email (optional)"><input type="email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} /></Field>
      </div>
      <div className="grid2">
        <Field label="Thesis title"><input type="text" value={form.thesisTitle} onChange={(e) => set('thesisTitle', e.target.value)} /></Field>
        <Field label="Current position (for alumni)"><input type="text" value={form.currentPosition} onChange={(e) => set('currentPosition', e.target.value)} /></Field>
      </div>
      <Field label="Research interests" hint="Comma-separated, e.g. school safety, evacuation, Nepal"><input type="text" value={form.interests} onChange={(e) => set('interests', e.target.value)} /></Field>
      <LinksField label="Links" value={form.links} onChange={(v) => set('links', v)} />
      <MultiFileField label="Documents" value={form.documents} onChange={(v) => set('documents', v)} target={{ area: 'members' }} accept=".pdf,.doc,.docx,.ppt,.pptx,application/pdf" hint="Papers, posters or slides you want to show on your page. Give each a title." />
      <div className="row">
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
        <Link className="btn secondary" to={`/members/${member.slug}`}>View my page</Link>
      </div>
    </div>
  );
}

function SubmitPost({ member, onDone }: { member?: MemberView; onDone: () => void }) {
  const toast = useToast();
  const auth = useAuth();
  const [f, setF] = useState({ title: '', category: 'STUDENT_ACTIVITY', eventDate: today(), location: '', excerpt: '', body: '', images: [] as Photo[] });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!f.title.trim()) return toast('Please add a title.', true);
    setBusy(true);
    try {
      const payload = { ...f, imageKeys: f.images.map((i) => i.key), images: undefined, memberIds: member ? [member.id] : [], authorName: member?.name ?? auth.name ?? auth.email };
      unwrap(
        await userClient.models.Submission.create({
          kind: 'POST',
          status: 'PENDING',
          title: f.title,
          payload: JSON.stringify(payload),
          attachmentKeys: f.images.map((i) => i.key),
          submitterName: member?.name ?? auth.email,
          memberId: member?.id,
        }),
      );
      changed('Submission', 'submit', '', f.title);
      toast('Sent for approval. You will see it under “My submissions”.');
      onDone();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="form">
      <div className="alert info">Write up an internship, fieldwork trip, conference presentation or seminar event. An administrator reviews it before it is published under News & Events.</div>
      <Field label="Title"><input type="text" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
      <div className="grid2">
        <Field label="Category">
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {['STUDENT_ACTIVITY', 'INTERNSHIP', 'FIELDWORK', 'CONFERENCE', 'AWARD', 'EVENT', 'SEMINAR'].map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
        </Field>
        <Field label="Date"><input type="date" value={f.eventDate} onChange={(e) => setF({ ...f, eventDate: e.target.value })} /></Field>
      </div>
      <Field label="Location"><input type="text" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
      <Field label="Summary (one or two sentences)"><textarea value={f.excerpt} onChange={(e) => setF({ ...f, excerpt: e.target.value })} style={{ minHeight: 70 }} /></Field>
      <Field label="Full report" hint="Markdown supported: **bold**, ## headings, - lists, [links](https://…)"><textarea className="tall" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
      <MultiFileField label="Photos" value={f.images} onChange={(v) => setF({ ...f, images: v })} target={{ area: 'submissions' }} />
      <div><button className="btn" onClick={submit} disabled={busy}>{busy ? 'Sending…' : 'Send for approval'}</button></div>
    </div>
  );
}

function SubmitPublication({ member, onDone }: { member?: MemberView; onDone: () => void }) {
  const toast = useToast();
  const auth = useAuth();
  const [f, setF] = useState({ kind: 'PAPER', year: new Date().getFullYear(), title: '', authors: member?.name ?? '', venue: '', doi: '', url: '', note: '', peerReviewed: false, pdfKey: null as string | null });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!f.title.trim()) return toast('Please add a title.', true);
    setBusy(true);
    try {
      unwrap(
        await userClient.models.Submission.create({
          kind: 'PUBLICATION',
          status: 'PENDING',
          title: f.title,
          payload: JSON.stringify({ ...f, memberIds: member ? [member.id] : [] }),
          attachmentKeys: f.pdfKey ? [f.pdfKey] : [],
          submitterName: member?.name ?? auth.email,
          memberId: member?.id,
        }),
      );
      changed('Submission', 'submit', '', f.title);
      toast('Publication sent for approval.');
      onDone();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="form">
      <div className="grid2">
        <Field label="Type">
          <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
            {Object.entries(KIND_SINGULAR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Year"><input type="number" value={f.year} onChange={(e) => setF({ ...f, year: Number(e.target.value) })} /></Field>
      </div>
      <Field label="Title"><input type="text" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
      <Field label="Authors"><input type="text" value={f.authors} onChange={(e) => setF({ ...f, authors: e.target.value })} /></Field>
      <Field label="Journal / conference / publisher, volume, pages"><input type="text" value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} /></Field>
      <div className="grid2">
        <Field label="DOI"><input type="text" placeholder="10.xxxx/…" value={f.doi} onChange={(e) => setF({ ...f, doi: e.target.value })} /></Field>
        <Field label="Link"><input type="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></Field>
      </div>
      <label className="check"><input type="checkbox" checked={f.peerReviewed} onChange={(e) => setF({ ...f, peerReviewed: e.target.checked })} /> Peer-reviewed</label>
      <FileField label="PDF (optional, only if you may share it)" value={f.pdfKey} onChange={(k) => setF({ ...f, pdfKey: k })} target={{ area: 'submissions' }} accept="application/pdf" image={false} />
      <div><button className="btn" onClick={submit} disabled={busy}>{busy ? 'Sending…' : 'Send for approval'}</button></div>
    </div>
  );
}

function MySubmissions({ reloadKey }: { reloadKey: number }) {
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => listAll<Submission>(userClient.models.Submission), [reloadKey]);
  const list = useMemo(() => [...(data ?? [])].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')), [data]);
  if (loading) return <Loading />;
  if (!list.length) return <div className="empty">You have not sent anything yet.</div>;
  const withdraw = async (s: Submission) => {
    if (!confirm('Withdraw this submission?')) return;
    try {
      unwrap(await userClient.models.Submission.delete({ id: s.id }));
      reload();
    } catch (e) {
      toast((e as Error).message, true);
    }
  };
  return (
    <div className="table-wrap">
      <table className="data">
        <thead><tr><th>Sent</th><th>Type</th><th>Title</th><th>Status</th><th /></tr></thead>
        <tbody>
          {list.map((s) => (
            <tr key={s.id}>
              <td className="small">{formatDate(s.createdAt)}</td>
              <td className="small">{s.kind === 'POST' ? CATEGORY_LABELS[parseJson<{ category?: string }>(s.payload, {}).category ?? 'NEWS'] : 'Publication'}</td>
              <td>{s.title}{s.reviewNote && <div className="small muted">Note from reviewer: {s.reviewNote}</div>}</td>
              <td>{s.status === 'APPROVED' ? <span className="tag ok">Published</span> : s.status === 'RETURNED' ? <span className="tag danger">Returned</span> : <span className="tag gold">Waiting</span>}</td>
              <td className="actions">{s.status !== 'APPROVED' && <button className="btn ghost sm" onClick={() => withdraw(s)}>Withdraw</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Portal() {
  const auth = useAuth();
  const { members, loading } = useMembers();
  const [tab, setTab] = useState<Tab>('profile');
  const [reloadKey, setReloadKey] = useState(0);
  const member = members.find((m) => m.ownerId && m.ownerId === auth.sub);
  useEffect(() => {
    if (!loading && !member) setTab((t) => (t === 'profile' ? 'post' : t));
  }, [loading, member]);
  const done = () => {
    setReloadKey((k) => k + 1);
    setTab('submissions');
  };

  return (
    <>
      <PageHeader eyebrow="Members area" title={member ? `Welcome, ${member.name}` : 'My page'} intro={`Signed in as ${auth.email ?? ''}`} />
      <section className="section">
        <div className="container" style={{ maxWidth: 940 }}>
          <div className="spread" style={{ marginBottom: 8 }}>
            <div className="tabs" style={{ marginBottom: 0, borderBottom: 0 }}>
              {member && <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>My profile</button>}
              <button className={tab === 'post' ? 'active' : ''} onClick={() => setTab('post')}>Submit news / report</button>
              <button className={tab === 'publication' ? 'active' : ''} onClick={() => setTab('publication')}>Submit publication</button>
              <button className={tab === 'submissions' ? 'active' : ''} onClick={() => setTab('submissions')}>My submissions</button>
            </div>
            <div className="row">
              {auth.isStaff && <Link className="btn secondary sm" to="/admin">Admin console</Link>}
              <button className="btn ghost sm" onClick={() => void auth.signOut()}>Sign out</button>
            </div>
          </div>
          <div className="panel">
            {loading ? (
              <Loading />
            ) : (
              <>
                {tab === 'profile' && member && <ProfileForm key={member.id + (member.profile?.updatedAt ?? '')} member={member} />}
                {tab === 'post' && <SubmitPost member={member} onDone={done} />}
                {tab === 'publication' && <SubmitPublication member={member} onDone={done} />}
                {tab === 'submissions' && <MySubmissions reloadKey={reloadKey} />}
              </>
            )}
            {!loading && !member && !auth.isStaff && (
              <div className="alert warn" style={{ marginTop: 16 }}>Your login is not yet linked to a student profile. Please ask Prof. Sakurai or an administrator to link it.</div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
