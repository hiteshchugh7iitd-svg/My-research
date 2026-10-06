import { cloneElement, isValidElement, useId, useRef, useState, type DragEvent, type ReactElement, type ReactNode } from 'react';
import type { UploadTarget } from '../lib/files';
import { bytes } from '../lib/format';
import { uploads, useUploads, type UploadItem } from '../lib/uploads';
import type { MemberView } from '../lib/members';
import { Img } from './ui';

/** Labelled form row. A single input/select/textarea child is linked to the label for screen readers. */
export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  const id = useId();
  const linkable = isValidElement(children) && typeof children.type === 'string' && ['input', 'select', 'textarea'].includes(children.type);
  return (
    <div className="field">
      {label && (linkable ? <label htmlFor={id}>{label}</label> : <label>{label}</label>)}
      {linkable ? cloneElement(children as ReactElement<{ id?: string }>, { id }) : children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

/** Drop area that accepts files by drag-and-drop or the file picker. */
export function DropZone({ onFiles, accept, multiple = true, children }: { onFiles: (f: File[]) => void; accept?: string; multiple?: boolean; children?: ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };
  return (
    <div
      className={'dropzone' + (over ? ' over' : '')}
      onClick={() => input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
    >
      {children ?? <>Drop files here or <u>choose files</u></>}
      <input
        ref={input}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
    </div>
  );
}

/** Per-file progress list for an upload batch, with cancel and retry. */
export function UploadList({ items, compact }: { items: UploadItem[]; compact?: boolean }) {
  if (!items.length) return null;
  return (
    <div className="stack" style={{ marginTop: 10 }}>
      {items.map((i) => (
        <div key={i.id} className="small">
          <div className="spread" style={{ gap: 8 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: compact ? 200 : 420 }}>{i.name}</span>
            <span className="row" style={{ gap: 6 }}>
              <span className="muted">{bytes(i.size)}</span>
              {i.state === 'duplicate' && <span className="tag gold">Already stored</span>}
              {i.state === 'done' && <span className="tag ok">Uploaded</span>}
              {i.state === 'error' && <span className="tag danger" title={i.error}>Failed</span>}
              {i.state === 'cancelled' && <span className="tag grey">Cancelled</span>}
              {(i.state === 'queued' || i.state === 'uploading') && (
                <button type="button" className="btn ghost sm" onClick={() => uploads.cancel(i.id)}>Cancel</button>
              )}
              {(i.state === 'error' || i.state === 'cancelled') && (
                <button type="button" className="btn ghost sm" onClick={() => uploads.retry(i.id)}>Retry</button>
              )}
            </span>
          </div>
          <div className={'progress' + (i.state === 'done' || i.state === 'duplicate' ? ' done' : i.state === 'error' ? ' error' : '')}>
            <i style={{ width: `${Math.round(i.progress * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

let batchSeq = 0;
const newBatch = () => `b${++batchSeq}-${Date.now()}`;

/** Single image or file stored in S3. */
export function FileField({ label, value, onChange, target, accept = 'image/*', hint, image = true }: { label: string; value?: string | null; onChange: (key: string | null) => void; target: UploadTarget; accept?: string; hint?: ReactNode; image?: boolean }) {
  const [batch] = useState(newBatch);
  const items = useUploads(batch).filter((i) => i.state !== 'done' && i.state !== 'duplicate');
  const add = async (files: File[]) => {
    const [res] = await uploads.add(files.slice(0, 1), target, batch);
    if (res) onChange(res.key);
    uploads.clearFinished(batch);
  };
  const failed = useUploads(batch).filter((i) => i.state === 'error');
  return (
    <Field label={label} hint={hint}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        {value && (
          <div className="thumbs" style={{ width: 120 }}>
            <div className="t">
              {image ? <Img k={value} alt="" /> : <div className="doc">{value.split('/').pop()?.replace(/^[0-9a-f]{16}-/, '')}</div>}
              <button type="button" className="x" onClick={() => onChange(null)} aria-label="Remove">×</button>
            </div>
          </div>
        )}
        <div className="grow">
          <DropZone onFiles={add} accept={accept} multiple={false}>
            {value ? 'Replace — drop a file or click' : 'Drop a file here or click to choose'}
          </DropZone>
          <UploadList items={items} compact />
          {failed.length > 0 && <div className="alert error small" style={{ marginTop: 6 }}>Upload failed: {failed[0].error}</div>}
        </div>
      </div>
    </Field>
  );
}

export type Photo = { key: string; caption?: string };

/** Many images or documents, uploaded in parallel, with captions and ordering. */
export function MultiFileField({ label, value, onChange, target, accept = 'image/*', captions = true, hint }: { label: string; value: Photo[]; onChange: (v: Photo[]) => void; target: UploadTarget; accept?: string; captions?: boolean; hint?: ReactNode }) {
  const [batch] = useState(newBatch);
  const items = useUploads(batch);
  const valueRef = useRef(value);
  valueRef.current = value;
  const add = async (files: File[]) => {
    const results = await uploads.add(files, target, batch);
    const known = new Set(valueRef.current.map((p) => p.key));
    const added = results.filter((r): r is NonNullable<typeof r> => !!r && !known.has(r.key)).map((r) => ({ key: r.key, caption: '' }));
    onChange([...valueRef.current, ...added]);
  };
  const move = (i: number, d: number) => {
    const next = [...value];
    const [x] = next.splice(i, 1);
    next.splice(Math.max(0, Math.min(next.length, i + d)), 0, x);
    onChange(next);
  };
  const isImage = accept.startsWith('image');
  return (
    <Field label={`${label} (${value.length})`} hint={hint}>
      {value.length > 0 && (
        <div className="thumbs" style={{ marginBottom: 10 }}>
          {value.map((p, i) => (
            <div className="t" key={p.key}>
              {isImage ? <Img k={p.key} alt="" /> : <div className="doc">{p.key.split('/').pop()?.replace(/^[0-9a-f]{16}-/, '')}</div>}
              <button type="button" className="x" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove">×</button>
              <div className="mv">
                <button type="button" onClick={() => move(i, -1)} aria-label="Move earlier">◀</button>
                <button type="button" onClick={() => move(i, 1)} aria-label="Move later">▶</button>
              </div>
              {captions && (
                <input
                  placeholder={isImage ? 'Caption' : 'Title'}
                  value={p.caption ?? ''}
                  onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))}
                />
              )}
            </div>
          ))}
        </div>
      )}
      <DropZone onFiles={add} accept={accept}>
        Drop several files at once (they upload in parallel), or <u>choose files</u>
      </DropZone>
      <UploadList items={items.filter((i) => i.state !== 'done')} />
      {items.some((i) => i.state === 'done' || i.state === 'duplicate') && (
        <button type="button" className="btn ghost sm" onClick={() => uploads.clearFinished(batch)}>Clear finished</button>
      )}
    </Field>
  );
}

export type LinkRow = { label: string; url: string };

export function LinksField({ label, value, onChange }: { label: string; value: LinkRow[]; onChange: (v: LinkRow[]) => void }) {
  return (
    <Field label={label} hint="e.g. ORCID, researchmap, Google Scholar, LinkedIn, personal website">
      <div className="stack" style={{ gap: 6 }}>
        {value.map((l, i) => (
          <div className="row" key={i} style={{ flexWrap: 'nowrap' }}>
            <input className="input" style={{ width: 160 }} placeholder="Label" value={l.label} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
            <input className="input grow" placeholder="https://…" value={l.url} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
            <button type="button" className="btn ghost sm" onClick={() => onChange(value.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}
        <div>
          <button type="button" className="btn secondary sm" onClick={() => onChange([...value, { label: '', url: '' }])}>+ Add link</button>
        </div>
      </div>
    </Field>
  );
}

export function MemberPicker({ label, value, onChange, members }: { label: string; value: string[]; onChange: (v: string[]) => void; members: MemberView[] }) {
  const [q, setQ] = useState('');
  const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name));
  const shown = sorted.filter((m) => value.includes(m.id) || !q || m.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Field label={`${label} (${value.length} selected)`}>
      <input className="input" placeholder="Filter names…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 6 }} />
      <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 6, padding: '6px 10px', background: '#fff' }}>
        {shown.map((m) => (
          <label key={m.id} className="check" style={{ padding: '3px 0' }}>
            <input type="checkbox" checked={value.includes(m.id)} onChange={(e) => onChange(e.target.checked ? [...value, m.id] : value.filter((x) => x !== m.id))} />
            {m.name} <span className="muted small">{m.status === 'ALUMNI' ? '(alumni)' : ''}</span>
          </label>
        ))}
        {!shown.length && <span className="muted small">No members yet.</span>}
      </div>
    </Field>
  );
}
