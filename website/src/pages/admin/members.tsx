/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { parseJson, userClient, unwrap, type Member, type MemberProfile } from '../../lib/amplify';
import { useAuth } from '../../lib/auth';
import { changed } from '../../lib/audit';
import { formatDate, normalize, PROGRAM_LABELS, slugify, STATUS_LABELS, uniqueSlug } from '../../lib/format';
import { mergeMembers, type MemberView } from '../../lib/members';
import { Field } from '../../components/fields';
import { Loading, Portrait, useToast } from '../../components/ui';
import { useAsync } from '../../lib/store';
import { Drawer, FormFields, useLiveModel, type FieldDef } from './crud';

export type CognitoUser = { username: string; sub: string; email: string; name: string; status: string; enabled: boolean; createdAt: string; groups: string[] };

/** Calls the account-management Lambda. */
export async function manageUser(args: { action: string; email?: string; name?: string; role?: string; username?: string }): Promise<any> {
  const res = await userClient.mutations.manageUser(args);
  return parseJson(unwrap(res), null);
}

const opts = (m: Record<string, string>) => Object.entries(m).map(([value, label]) => ({ value, label }));

const ROSTER: FieldDef[] = [
  { name: 'name', label: 'Name (as shown, e.g. Hinata TANAKA)', type: 'text', required: true },
  { name: 'nameJa', label: 'Name in Japanese / native script', type: 'text' },
  { name: 'program', label: 'Programme', type: 'select', options: opts(PROGRAM_LABELS), required: true, half: true },
  { name: 'status', label: 'Status', type: 'select', options: opts(STATUS_LABELS), required: true, half: true },
  { name: 'entryYear', label: 'Year of entry', type: 'number', half: true },
  { name: 'graduationYear', label: 'Graduation year (alumni)', type: 'number', half: true },
  { name: 'visible', label: 'Show on the website', type: 'checkbox', half: true },
  { name: 'sortOrder', label: 'Display order (lower first)', type: 'number', half: true },
  { name: 'slug', label: 'Web address (leave blank to generate)', type: 'text' },
];
const PROFILE: FieldDef[] = [
  { name: 'photoKey', label: 'Profile photo', type: 'image', folder: 'members' },
  { name: 'researchTopic', label: 'Research topic', type: 'text', half: true },
  { name: 'researchTopicJa', label: 'Research topic (日本語)', type: 'text', half: true },
  { name: 'country', label: 'Country or region', type: 'text', half: true },
  { name: 'contactEmail', label: 'Public contact email', type: 'text', half: true },
  { name: 'bio', label: 'Biography', type: 'textarea' },
  { name: 'bioJa', label: 'Biography (日本語)', type: 'textarea' },
  { name: 'thesisTitle', label: 'Thesis title', type: 'text', half: true },
  { name: 'currentPosition', label: 'Current position (alumni)', type: 'text', half: true },
  { name: 'interests', label: 'Research interests', type: 'tags' },
  { name: 'cvKey', label: 'CV (PDF)', type: 'file', folder: 'members' },
];

function formFrom(m?: MemberView): Record<string, any> {
  const p = m?.profile;
  return {
    name: m?.name ?? '',
    nameJa: m?.nameJa ?? '',
    program: m?.program ?? 'MASTERS',
    status: m?.status ?? 'CURRENT',
    entryYear: m?.entryYear ?? new Date().getFullYear(),
    graduationYear: m?.graduationYear ?? '',
    visible: m ? m.visible !== false : true,
    sortOrder: m?.sortOrder ?? 100,
    slug: m?.slug ?? '',
    photoKey: p?.photoKey ?? '',
    researchTopic: p?.researchTopic ?? '',
    researchTopicJa: p?.researchTopicJa ?? '',
    country: p?.country ?? '',
    contactEmail: p?.contactEmail ?? '',
    bio: p?.bio ?? '',
    bioJa: p?.bioJa ?? '',
    thesisTitle: p?.thesisTitle ?? '',
    currentPosition: p?.currentPosition ?? '',
    interests: (p?.interests ?? []).join(', '),
    cvKey: p?.cvKey ?? '',
  };
}

const nul = (v: any) => (v === '' || v === undefined ? null : v);

/** Creates or updates a member and their profile. Used by the editor and by CSV import. */
export async function saveMember(form: Record<string, any>, all: Member[], existing?: MemberView): Promise<Member> {
  const taken = all.filter((x) => x.id !== existing?.id).map((x) => x.slug);
  const roster = {
    name: String(form.name).trim(),
    nameJa: nul(form.nameJa),
    program: form.program || 'MASTERS',
    status: form.status || 'CURRENT',
    entryYear: form.entryYear === '' || form.entryYear == null ? null : Number(form.entryYear),
    graduationYear: form.graduationYear === '' || form.graduationYear == null ? null : Number(form.graduationYear),
    visible: form.visible !== false,
    sortOrder: form.sortOrder === '' || form.sortOrder == null ? 100 : Number(form.sortOrder),
    slug: uniqueSlug(slugify(form.slug || form.name), taken),
  };
  const member = existing
    ? unwrap(await userClient.models.Member.update({ id: existing.id, ...roster }))
    : unwrap(await userClient.models.Member.create(roster));
  const profileFields: Record<string, any> = {};
  for (const k of ['photoKey', 'researchTopic', 'researchTopicJa', 'country', 'contactEmail', 'bio', 'bioJa', 'thesisTitle', 'currentPosition', 'cvKey']) {
    if (k in form) profileFields[k] = nul(form[k]);
  }
  if ('interests' in form) profileFields.interests = String(form.interests ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (Object.keys(profileFields).length) {
    if (existing?.profile) unwrap(await userClient.models.MemberProfile.update({ id: member!.id, ...profileFields }));
    else unwrap(await userClient.models.MemberProfile.create({ id: member!.id, ownerId: member!.ownerId ?? null, ...profileFields }));
  }
  changed('Member', existing ? 'update' : 'create', member!.id, roster.name);
  changed('MemberProfile', 'update', member!.id, roster.name);
  return member!;
}

/** Links a member record to a Cognito login so the student can edit their own profile. */
export async function linkLogin(member: MemberView, sub: string) {
  unwrap(await userClient.models.Member.update({ id: member.id, ownerId: sub }));
  if (member.profile) unwrap(await userClient.models.MemberProfile.update({ id: member.id, ownerId: sub }));
  else unwrap(await userClient.models.MemberProfile.create({ id: member.id, ownerId: sub }));
  changed('Member', 'link-login', member.id, member.name);
  changed('MemberProfile', 'link-login', member.id, member.name);
}

function InviteBox({ member, onDone }: { member: MemberView; onDone: () => void }) {
  const toast = useToast();
  const [email, setEmail] = useState(member.profile?.contactEmail ?? '');
  const [busy, setBusy] = useState(false);
  const invite = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast('Enter a valid email address.', true);
    setBusy(true);
    try {
      let user: CognitoUser | undefined;
      try {
        user = await manageUser({ action: 'invite', email, name: member.name, role: 'student' });
        toast(`Invitation sent to ${email}.`);
      } catch (e) {
        if (!/exist/i.test((e as Error).message)) throw e;
        const users: CognitoUser[] = await manageUser({ action: 'list' });
        user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (!user) throw e;
        toast(`${email} already had an account — linked it to ${member.name}.`);
      }
      await linkLogin(member, user!.sub);
      onDone();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };
  if (member.ownerId) {
    return (
      <div className="alert ok">
        Login linked — {member.name} can sign in and edit their own profile.{' '}
        <button className="btn ghost sm" onClick={async () => { if (confirm('Unlink this login? The student will no longer be able to edit this profile.')) { unwrap(await userClient.models.Member.update({ id: member.id, ownerId: null })); changed('Member', 'unlink-login', member.id, member.name); onDone(); } }}>Unlink</button>
      </div>
    );
  }
  return (
    <div className="panel" style={{ background: 'var(--teal-50)' }}>
      <h3>Give {member.name.split(' ')[0]} a login</h3>
      <p className="small">An invitation with a temporary password is emailed to the student. Once they sign in they can complete their own profile, upload a photo, CV and documents, and send news for approval.</p>
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <input className="input grow" type="email" placeholder="student@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn" onClick={invite} disabled={busy}>{busy ? 'Sending…' : 'Send invitation'}</button>
      </div>
    </div>
  );
}

export function MembersAdmin() {
  const toast = useToast();
  const { items: members, loading, reload: reloadMembers } = useLiveModel<Member>('Member');
  const { items: profiles, reload: reloadProfiles } = useLiveModel<MemberProfile>('MemberProfile');
  const reload = () => {
    reloadMembers();
    reloadProfiles();
  };
  const all = useMemo(() => mergeMembers(members, profiles), [members, profiles]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('CURRENT');
  const [editing, setEditing] = useState<{ m?: MemberView; form: Record<string, any>; loadedAt?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const current = editing?.m ? all.find((x) => x.id === editing.m!.id) : undefined;

  const shown = all
    .filter((m) => status === 'ALL' || m.status === status || (status === 'CURRENT' && !m.status))
    .filter((m) => !q || normalize([m.name, m.nameJa, m.profile?.researchTopic, m.profile?.country].join(' ')).includes(normalize(q)))
    .sort((a, b) => (b.entryYear ?? 0) - (a.entryYear ?? 0) || a.name.localeCompare(b.name));

  const save = async () => {
    if (!editing) return;
    if (!String(editing.form.name).trim()) return toast('Name is required.', true);
    setSaving(true);
    try {
      if (editing.m) {
        const latest = unwrap(await userClient.models.Member.get({ id: editing.m.id }));
        if (latest && editing.loadedAt && latest.updatedAt !== editing.loadedAt && !confirm('This member was changed in another tab or by another administrator. Overwrite?')) return;
      }
      const saved = await saveMember(editing.form, members, current ?? editing.m);
      toast('Member saved.');
      reload();
      if (!editing.m) {
        const view = mergeMembers([saved], [])[0];
        setEditing({ m: view, form: formFrom(view), loadedAt: saved.updatedAt });
      } else setEditing(null);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: MemberView) => {
    if (!confirm(`Delete ${m.name} from the website? Their profile text is deleted too. (Their login, if any, can be removed under Accounts.)`)) return;
    try {
      unwrap(await userClient.models.Member.delete({ id: m.id }));
      if (m.profile) unwrap(await userClient.models.MemberProfile.delete({ id: m.id }));
      changed('Member', 'delete', m.id, m.name);
      toast(`${m.name} deleted.`);
      reload();
      setEditing(null);
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  const graduate = async (m: MemberView) => {
    try {
      unwrap(await userClient.models.Member.update({ id: m.id, status: 'ALUMNI', graduationYear: m.graduationYear ?? new Date().getFullYear() }));
      changed('Member', 'graduate', m.id, m.name);
      toast(`${m.name} moved to Alumni.`);
      reload();
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  return (
    <>
      <div className="spread">
        <h1 style={{ margin: 0 }}>Students & alumni</h1>
        <div className="row">
          <Link className="btn secondary" to="/admin/import?type=members">Import CSV</Link>
          <button className="btn" onClick={() => setEditing({ form: formFrom() })}>+ Add student</button>
        </div>
      </div>
      <p className="muted">Add, edit or remove seminar members. Send a student an invitation so they can maintain their own profile page.</p>
      <div className="spread" style={{ margin: '14px 0' }}>
        <div className="chips">
          {[['CURRENT', 'Current'], ['ALUMNI', 'Alumni'], ['ON_LEAVE', 'On leave'], ['ALL', 'All']].map(([k, l]) => (
            <button key={k} className={'chip' + (status === k ? ' active' : '')} onClick={() => setStatus(k)}>
              {l}<span className="n">{k === 'ALL' ? all.length : all.filter((m) => m.status === k || (k === 'CURRENT' && !m.status)).length}</span>
            </button>
          ))}
        </div>
        <input className="input" style={{ width: 240 }} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {loading ? (
        <Loading />
      ) : shown.length ? (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th style={{ width: 52 }} /><th>Name</th><th>Programme</th><th>Entry</th><th>Profile</th><th>Login</th><th /></tr></thead>
            <tbody>
              {shown.map((m) => (
                <tr key={m.id}>
                  <td><div className="avatar"><Portrait k={m.profile?.photoKey} name={m.name} /></div></td>
                  <td><b>{m.name}</b> {m.visible === false && <span className="tag grey">Hidden</span>}<div className="small muted">{m.nameJa} {m.profile?.country && `· ${m.profile.country}`}</div></td>
                  <td className="small">{m.program ? PROGRAM_LABELS[m.program] : ''}</td>
                  <td className="small">{m.entryYear}{m.status === 'ALUMNI' && m.graduationYear ? ` → ${m.graduationYear}` : ''}</td>
                  <td className="small">{m.profile?.updatedAt ? `Updated ${formatDate(m.profile.updatedAt)}` : <span className="muted">Empty</span>}</td>
                  <td>{m.ownerId ? <span className="tag ok">Linked</span> : <span className="tag grey">None</span>}</td>
                  <td className="actions">
                    {m.status !== 'ALUMNI' && <button className="btn ghost sm" onClick={() => graduate(m)} title="Move to alumni">Graduate</button>}
                    <button className="btn ghost sm" onClick={() => setEditing({ m, form: formFrom(m), loadedAt: m.updatedAt })}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">No members in this list.</div>
      )}

      {editing && (
        <Drawer
          title={editing.m ? editing.m.name : 'New student'}
          onClose={() => setEditing(null)}
          footer={
            <>
              {editing.m && <button className="btn danger" style={{ marginRight: 'auto' }} onClick={() => remove(current ?? editing.m!)}>Delete</button>}
              <button className="btn secondary" onClick={() => setEditing(null)}>Close</button>
              <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </>
          }
        >
          {editing.m && <div style={{ marginBottom: 18 }}><InviteBox member={current ?? editing.m} onDone={reload} /></div>}
          <h3>Roster (staff only)</h3>
          <FormFields fields={ROSTER} form={editing.form} set={(n, v) => setEditing((e) => e && { ...e, form: { ...e.form, [n]: v } })} />
          <h3 style={{ marginTop: 26 }}>Profile {current?.ownerId && <span className="small muted">— the student can also edit this</span>}</h3>
          <FormFields fields={PROFILE} form={editing.form} set={(n, v) => setEditing((e) => e && { ...e, form: { ...e.form, [n]: v } })} />
        </Drawer>
      )}
    </>
  );
}

export function AccountsAdmin() {
  const toast = useToast();
  const auth = useAuth();
  const { data, loading, error, reload } = useAsync<CognitoUser[]>(() => manageUser({ action: 'list' }), []);
  const [form, setForm] = useState({ email: '', name: '', role: 'student' });
  const [busy, setBusy] = useState('');
  const users = useMemo(() => [...(data ?? [])].sort((a, b) => (a.groups[0] ?? 'z').localeCompare(b.groups[0] ?? 'z') || a.email.localeCompare(b.email)), [data]);
  const roleOf = (u: CognitoUser) => (u.groups.includes('professor') ? 'professor' : u.groups.includes('admin') ? 'admin' : u.groups.includes('student') ? 'student' : '');
  const act = async (label: string, args: Parameters<typeof manageUser>[0]) => {
    setBusy(label);
    try {
      await manageUser(args);
      toast('Done.');
      reload();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy('');
    }
  };
  const roles = auth.isProfessor ? ['student', 'admin', 'professor'] : ['student'];

  return (
    <>
      <h1>Accounts & roles</h1>
      <p className="muted">
        Who can sign in. <b>Professor</b> — full control including appointing admins. <b>Admin</b> — manages all content and student accounts.
        <b> Student</b> — edits their own profile and sends news for approval. {auth.isProfessor ? '' : 'Only Prof. Sakurai can create or change admin accounts.'}
      </p>
      <div className="panel">
        <h3>Invite someone</h3>
        <div className="row">
          <input className="input" style={{ width: 260 }} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" style={{ width: 220 }} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="input" style={{ width: 'auto' }} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className="btn" disabled={!!busy} onClick={() => act('invite', { action: 'invite', ...form })}>Send invitation</button>
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>For students, it is usually easier to invite from the student’s record under Students — that also links the login to their profile page.</p>
      </div>
      <div className="panel">
        {loading ? (
          <Loading />
        ) : error ? (
          <div className="alert error">{error}</div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Email</th><th>Name</th><th>Role</th><th>State</th><th>Created</th><th /></tr></thead>
              <tbody>
                {users.map((u) => {
                  const r = roleOf(u);
                  const self = u.sub === auth.sub;
                  const locked = !auth.isProfessor && (r === 'admin' || r === 'professor');
                  return (
                    <tr key={u.username}>
                      <td>{u.email} {self && <span className="tag gold">You</span>}</td>
                      <td className="small">{u.name}</td>
                      <td>
                        <select className="input" style={{ width: 'auto', padding: '4px 8px' }} value={r} disabled={locked || self || !!busy} onChange={(e) => act('role', { action: 'setRole', username: u.username, role: e.target.value })}>
                          {!r && <option value="">—</option>}
                          {(locked ? [r] : roles).map((x) => <option key={x} value={x}>{x}</option>)}
                        </select>
                      </td>
                      <td className="small">{!u.enabled ? <span className="tag danger">Disabled</span> : u.status === 'FORCE_CHANGE_PASSWORD' ? <span className="tag gold">Invited</span> : <span className="tag ok">Active</span>}</td>
                      <td className="small">{formatDate(u.createdAt)}</td>
                      <td className="actions">
                        {!self && !locked && (
                          <>
                            {u.status === 'FORCE_CHANGE_PASSWORD' && <button className="btn ghost sm" onClick={() => act('resend', { action: 'resend', email: u.email })}>Resend</button>}
                            <button className="btn ghost sm" onClick={() => act('toggle', { action: u.enabled ? 'disable' : 'enable', username: u.username })}>{u.enabled ? 'Disable' : 'Enable'}</button>
                            <button className="btn ghost sm" style={{ color: 'var(--danger)' }} onClick={() => confirm(`Permanently delete the login for ${u.email}?`) && act('delete', { action: 'delete', username: u.username })}>Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Field label="">
        <span className="small muted">Accounts are stored in Amazon Cognito. Passwords are never visible to administrators.</span>
      </Field>
    </>
  );
}
