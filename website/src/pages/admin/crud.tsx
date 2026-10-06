/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { listAll, parseJson, userClient, unwrap, type ModelName } from '../../lib/amplify';
import { changed } from '../../lib/audit';
import { normalize } from '../../lib/format';
import { useMembers } from '../../lib/members';
import { Field, FileField, MemberPicker, MultiFileField, type Photo } from '../../components/fields';
import { Loading, useToast } from '../../components/ui';

export type FieldDef = {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'markdown' | 'number' | 'date' | 'select' | 'checkbox' | 'image' | 'file' | 'images' | 'tags' | 'members' | 'url';
  options?: { value: string; label: string }[];
  /** Where image/file uploads are stored, e.g. "news" → site/news/… */
  folder?: string;
  /** For "images": stored as JSON [{key,caption}] ("json") or as a string array of keys ("keys"). */
  store?: 'json' | 'keys';
  required?: boolean;
  hint?: ReactNode;
  half?: boolean;
  accept?: string;
};

export type Column = { label: string; render: (item: any) => ReactNode; width?: number | string };

export type CrudConfig = {
  model: ModelName;
  title: string;
  singular: string;
  intro?: ReactNode;
  fields: FieldDef[];
  columns: Column[];
  searchText: (item: any) => string;
  sort?: (a: any, b: any) => number;
  defaults: () => Record<string, any>;
  /** Final adjustments before saving (e.g. generate a unique slug). */
  beforeSave?: (input: Record<string, any>, all: any[], existing?: any) => Record<string, any>;
  label: (item: any) => string;
  filters?: { label: string; test: (item: any) => boolean }[];
  toolbar?: (ctx: { items: any[]; reload: () => void }) => ReactNode;
};

/** Live list of every item in a model for staff; updates when anyone (any tab, any admin) changes it. */
export function useLiveModel<T = any>(model: ModelName): { items: T[]; loading: boolean; error?: string; reload: () => void } {
  const [state, setState] = useState<{ items: T[]; loading: boolean; error?: string }>({ items: [], loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    let sub: { unsubscribe: () => void } | undefined;
    const fallback = () =>
      listAll<T>((userClient.models as any)[model])
        .then((items) => alive && setState({ items, loading: false }))
        .catch((e: Error) => alive && setState({ items: [], loading: false, error: e.message }));
    try {
      sub = (userClient.models as any)[model].observeQuery().subscribe({
        next: ({ items }: { items: T[] }) => alive && setState({ items: items.filter(Boolean), loading: false }),
        error: () => void fallback(),
      });
    } catch {
      void fallback();
    }
    return () => {
      alive = false;
      sub?.unsubscribe();
    };
  }, [model, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}

function toForm(fields: FieldDef[], item: any): Record<string, any> {
  const f: Record<string, any> = {};
  for (const d of fields) {
    const v = item?.[d.name];
    if (d.type === 'images') {
      f[d.name] = d.store === 'keys' ? ((v ?? []) as string[]).filter(Boolean).map((key) => ({ key, caption: '' })) : parseJson<Photo[]>(v, []);
    } else if (d.type === 'tags') f[d.name] = ((v ?? []) as string[]).join(', ');
    else if (d.type === 'members') f[d.name] = (v ?? []) as string[];
    else if (d.type === 'checkbox') f[d.name] = !!v;
    else f[d.name] = v ?? '';
  }
  return f;
}

function toInput(fields: FieldDef[], form: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const d of fields) {
    const v = form[d.name];
    if (d.type === 'images') out[d.name] = d.store === 'keys' ? (v as Photo[]).map((p) => p.key) : JSON.stringify(v as Photo[]);
    else if (d.type === 'tags') out[d.name] = String(v ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (d.type === 'number') out[d.name] = v === '' || v == null ? null : Number(v);
    else if (d.type === 'checkbox') out[d.name] = !!v;
    else if (d.type === 'members') out[d.name] = v ?? [];
    else out[d.name] = v === '' ? null : v;
  }
  return out;
}

export function FormFields({ fields, form, set }: { fields: FieldDef[]; form: Record<string, any>; set: (name: string, v: any) => void }) {
  const { members } = useMembers();
  const rows: FieldDef[][] = [];
  for (const f of fields) {
    const last = rows[rows.length - 1];
    if (f.half && last && last.length === 1 && last[0].half) last.push(f);
    else rows.push([f]);
  }
  const one = (d: FieldDef) => {
    const v = form[d.name];
    const label = d.label + (d.required ? ' *' : '');
    switch (d.type) {
      case 'textarea':
        return <Field key={d.name} label={label} hint={d.hint}><textarea value={v ?? ''} onChange={(e) => set(d.name, e.target.value)} /></Field>;
      case 'markdown':
        return <Field key={d.name} label={label} hint={d.hint ?? 'Markdown: **bold**, ## heading, - list, [link](https://…), ![photo](image-url)'}><textarea className="tall" value={v ?? ''} onChange={(e) => set(d.name, e.target.value)} /></Field>;
      case 'number':
        return <Field key={d.name} label={label} hint={d.hint}><input type="number" value={v ?? ''} onChange={(e) => set(d.name, e.target.value)} /></Field>;
      case 'date':
        return <Field key={d.name} label={label} hint={d.hint}><input type="date" value={v ?? ''} onChange={(e) => set(d.name, e.target.value)} /></Field>;
      case 'url':
        return <Field key={d.name} label={label} hint={d.hint}><input type="url" value={v ?? ''} onChange={(e) => set(d.name, e.target.value)} /></Field>;
      case 'select':
        return (
          <Field key={d.name} label={label} hint={d.hint}>
            <select value={v ?? ''} onChange={(e) => set(d.name, e.target.value)}>
              {!d.required && <option value="">—</option>}
              {d.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        );
      case 'checkbox':
        return (
          <label key={d.name} className="check" style={{ alignSelf: 'end', paddingBottom: 8 }}>
            <input type="checkbox" checked={!!v} onChange={(e) => set(d.name, e.target.checked)} /> {d.label}
          </label>
        );
      case 'image':
        return <FileField key={d.name} label={d.label} hint={d.hint} value={v || null} onChange={(k) => set(d.name, k ?? '')} target={{ area: 'site', folder: d.folder ?? 'misc' }} />;
      case 'file':
        return <FileField key={d.name} label={d.label} hint={d.hint} value={v || null} onChange={(k) => set(d.name, k ?? '')} target={{ area: 'site', folder: d.folder ?? 'files' }} accept={d.accept ?? 'application/pdf'} image={false} />;
      case 'images':
        return <MultiFileField key={d.name} label={d.label} hint={d.hint} value={v ?? []} onChange={(x) => set(d.name, x)} target={{ area: 'site', folder: d.folder ?? 'misc' }} captions={d.store !== 'keys'} />;
      case 'members':
        return <MemberPicker key={d.name} label={d.label} value={v ?? []} onChange={(x) => set(d.name, x)} members={members} />;
      case 'tags':
        return <Field key={d.name} label={label} hint={d.hint ?? 'Comma-separated'}><input type="text" value={v ?? ''} onChange={(e) => set(d.name, e.target.value)} /></Field>;
      default:
        return <Field key={d.name} label={label} hint={d.hint}><input type="text" value={v ?? ''} onChange={(e) => set(d.name, e.target.value)} /></Field>;
    }
  };
  return (
    <div className="form">
      {rows.map((r, i) => (r.length === 2 ? <div className="grid2" key={i}>{r.map(one)}</div> : one(r[0])))}
    </div>
  );
}

export function Drawer({ title, onClose, children, footer }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal>
        <header>
          <h2>{title}</h2>
          <button className="btn ghost" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="content">{children}</div>
        {footer && <footer>{footer}</footer>}
      </aside>
    </>
  );
}

/** Generic admin screen: searchable live table + create / edit / delete in a side drawer. */
export function CrudManager({ config }: { config: CrudConfig }) {
  const toast = useToast();
  const { items, loading, error, reload } = useLiveModel<any>(config.model);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState(-1);
  const [editing, setEditing] = useState<{ item?: any; form: Record<string, any>; loadedAt?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const shown = useMemo(() => {
    const nq = normalize(q);
    const list = items.filter((i) => (filter < 0 || config.filters![filter].test(i)) && (!nq || normalize(config.searchText(i)).includes(nq)));
    return config.sort ? [...list].sort(config.sort) : list;
  }, [items, q, filter, config]);

  const open = (item?: any) => setEditing({ item, form: toForm(config.fields, item ?? config.defaults()), loadedAt: item?.updatedAt });
  const set = (name: string, v: any) => setEditing((e) => (e ? { ...e, form: { ...e.form, [name]: v } } : e));
  const model = (userClient.models as any)[config.model];

  const save = async () => {
    if (!editing) return;
    const missing = config.fields.filter((f) => f.required && (editing.form[f.name] === '' || editing.form[f.name] == null));
    if (missing.length) return toast(`Please fill in: ${missing.map((m) => m.label).join(', ')}`, true);
    setSaving(true);
    try {
      let input = toInput(config.fields, editing.form);
      if (config.beforeSave) input = config.beforeSave(input, items, editing.item);
      if (editing.item) {
        const latest = unwrap<any>(await model.get({ id: editing.item.id }));
        if (latest && editing.loadedAt && latest.updatedAt !== editing.loadedAt && !confirm(`“${config.label(latest)}” was changed in another tab or by another administrator while you were editing. Overwrite with your version?`)) {
          return;
        }
        unwrap(await model.update({ id: editing.item.id, ...input }));
        changed(config.model, 'update', editing.item.id, config.label({ ...editing.item, ...input }));
        toast(`${config.singular} saved.`);
      } else {
        const created = unwrap<any>(await model.create(input));
        changed(config.model, 'create', created?.id ?? '', config.label(input));
        toast(`${config.singular} added.`);
      }
      setEditing(null);
      reload();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (ids: string[]) => {
    if (!ids.length || !confirm(`Delete ${ids.length === 1 ? 'this ' + config.singular.toLowerCase() : ids.length + ' items'}? This cannot be undone.`)) return;
    let ok = 0;
    for (const id of ids) {
      try {
        const it = items.find((i) => i.id === id);
        unwrap(await model.delete({ id }));
        changed(config.model, 'delete', id, it ? config.label(it) : id);
        ok++;
      } catch (e) {
        toast((e as Error).message, true);
      }
    }
    toast(`Deleted ${ok} item${ok === 1 ? '' : 's'}.`);
    setSelected(new Set());
    setEditing(null);
    reload();
  };

  return (
    <>
      <div className="spread" style={{ marginBottom: 6 }}>
        <h1 style={{ margin: 0 }}>{config.title}</h1>
        <div className="row">
          {config.toolbar?.({ items, reload })}
          <button className="btn" onClick={() => open()}>+ Add {config.singular.toLowerCase()}</button>
        </div>
      </div>
      {config.intro && <p className="muted">{config.intro}</p>}
      <div className="spread" style={{ margin: '14px 0' }}>
        <div className="chips">
          {config.filters && (
            <>
              <button className={'chip' + (filter < 0 ? ' active' : '')} onClick={() => setFilter(-1)}>All<span className="n">{items.length}</span></button>
              {config.filters.map((f, i) => (
                <button key={f.label} className={'chip' + (filter === i ? ' active' : '')} onClick={() => setFilter(i)}>
                  {f.label}<span className="n">{items.filter(f.test).length}</span>
                </button>
              ))}
            </>
          )}
        </div>
        <div className="row">
          {selected.size > 0 && <button className="btn danger sm" onClick={() => remove([...selected])}>Delete {selected.size} selected</button>}
          <input className="input" style={{ width: 240 }} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {error && <div className="alert error">{error}</div>}
      {loading ? (
        <Loading />
      ) : shown.length ? (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th style={{ width: 30 }}>
                  <input type="checkbox" aria-label="Select all" checked={selected.size > 0 && selected.size === shown.length} onChange={(e) => setSelected(e.target.checked ? new Set(shown.map((i) => i.id)) : new Set())} />
                </th>
                {config.columns.map((c) => <th key={c.label} style={{ width: c.width }}>{c.label}</th>)}
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((it) => (
                <tr key={it.id} className={selected.has(it.id) ? 'sel' : ''}>
                  <td>
                    <input type="checkbox" checked={selected.has(it.id)} onChange={(e) => setSelected((s) => { const n = new Set(s); if (e.target.checked) n.add(it.id); else n.delete(it.id); return n; })} />
                  </td>
                  {config.columns.map((c) => <td key={c.label}>{c.render(it)}</td>)}
                  <td className="actions">
                    <button className="btn ghost sm" onClick={() => open(it)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">Nothing here yet. Use “Add {config.singular.toLowerCase()}”{config.toolbar ? ' or import from a file' : ''}.</div>
      )}
      <p className="small muted" style={{ marginTop: 10 }}>{shown.length} shown · updates live when anyone edits</p>

      {editing && (
        <Drawer
          title={editing.item ? `Edit ${config.singular.toLowerCase()}` : `New ${config.singular.toLowerCase()}`}
          onClose={() => setEditing(null)}
          footer={
            <>
              {editing.item && <button className="btn danger" onClick={() => remove([editing.item.id])} style={{ marginRight: 'auto' }}>Delete</button>}
              <button className="btn secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </>
          }
        >
          <FormFields fields={config.fields} form={editing.form} set={set} />
        </Drawer>
      )}
    </>
  );
}
