/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { parseJson, userClient, unwrap, type SiteContent } from '../../lib/amplify';
import { changed } from '../../lib/audit';
import { DEFAULTS, type ContentId } from '../../lib/defaults';
import { Field, FileField } from '../../components/fields';
import { Loading, useToast } from '../../components/ui';
import { useLiveModel } from './crud';

type F = { name: string; label: string; type?: 'text' | 'textarea' | 'image' | 'checkbox' | 'number'; hint?: string };
type Block = { id: ContentId; title: string; group: string; help: string; kind: 'object' | 'list'; fields: F[]; itemLabel?: (row: any) => string };

const BLOCKS: Block[] = [
  {
    id: 'heroSlides', group: 'Home page', title: 'Cover slideshow', kind: 'list',
    help: 'The large photos at the top of the home page. Each slide can have its own headline, text and “Read more” link; empty fields fall back to the site motto and introduction.',
    fields: [
      { name: 'image', label: 'Photo', type: 'image' },
      { name: 'headline', label: 'Headline (optional)' },
      { name: 'text', label: 'Text under the headline (optional)', type: 'textarea' },
      { name: 'caption', label: 'Photo caption (bottom right)' },
      { name: 'link', label: 'Read-more link (optional, e.g. /news/my-post)' },
    ],
    itemLabel: (r) => r.headline || r.caption || 'Slide',
  },
  {
    id: 'site', group: 'Home page', title: 'Site title, headlines & banner', kind: 'object',
    help: 'Name of the seminar, the tagline and motto shown on the cover, the introduction, and an optional announcement banner shown on every page.',
    fields: [
      { name: 'title', label: 'Site title' },
      { name: 'titleJa', label: 'Site title (日本語)' },
      { name: 'subtitle', label: 'Subtitle under the title' },
      { name: 'tagline', label: 'Tagline (small text above the cover headline)' },
      { name: 'motto', label: 'Motto / main headline' },
      { name: 'intro', label: 'Introduction on the cover', type: 'textarea' },
      { name: 'announcement', label: 'Announcement banner (leave empty to hide)', hint: 'e.g. “Applications for AY 2027 open on 1 November.”' },
    ],
  },
  {
    id: 'homeTiles', group: 'Home page', title: 'Feature tiles', kind: 'list',
    help: 'The picture boxes under the cover (like “Forthcoming events”). Four work best.',
    fields: [
      { name: 'label', label: 'Label' },
      { name: 'image', label: 'Picture', type: 'image' },
      { name: 'link', label: 'Link (e.g. /news?category=EVENT, /members, https://…)' },
    ],
    itemLabel: (r) => r.label || 'Tile',
  },
  {
    id: 'homeSections', group: 'Home page', title: 'Sections & buttons', kind: 'object',
    help: 'Show or hide parts of the home page, rename section headings and set the cover buttons.',
    fields: [
      { name: 'showTiles', label: 'Show feature tiles', type: 'checkbox' },
      { name: 'showMotto', label: 'Show motto line', type: 'checkbox' },
      { name: 'showNews', label: 'Show recent news', type: 'checkbox' },
      { name: 'showAbout', label: 'Show “about the seminar” section', type: 'checkbox' },
      { name: 'newsHeading', label: 'Recent news heading' },
      { name: 'newsCount', label: 'Number of news items on the home page', type: 'number' },
      { name: 'aboutHeading', label: '“About” section heading' },
      { name: 'ctaPrimaryLabel', label: 'Main cover button label' },
      { name: 'ctaPrimaryLink', label: 'Main cover button link' },
      { name: 'ctaSecondaryLabel', label: 'Second cover button label (empty to hide)' },
      { name: 'ctaSecondaryLink', label: 'Second cover button link' },
    ],
  },
  {
    id: 'professor', group: 'Pages', title: 'Prof. Sakurai profile', kind: 'object',
    help: 'Profile page text and portrait.',
    fields: [
      { name: 'photo', label: 'Portrait', type: 'image' },
      { name: 'name', label: 'Name' },
      { name: 'nameJa', label: 'Name (日本語)' },
      { name: 'titles', label: 'Positions (one per line)', type: 'textarea' },
      { name: 'bio', label: 'Biography', type: 'textarea' },
      { name: 'message', label: 'Message to students (also on the home page)', type: 'textarea' },
      { name: 'researchAreas', label: 'Research areas (one per line)', type: 'textarea' },
      { name: 'keywords', label: 'Keywords' },
    ],
  },
  {
    id: 'contact', group: 'Pages', title: 'Contact details', kind: 'object',
    help: 'Shown on the Contact page and in the footer.',
    fields: [
      { name: 'address', label: 'Address', type: 'textarea' },
      { name: 'email', label: 'Email' },
      { name: 'phone', label: 'Telephone' },
      { name: 'office', label: 'Office / room' },
      { name: 'mapUrl', label: 'Map link' },
      { name: 'instagram', label: 'Instagram link' },
      { name: 'prospective', label: 'Message for prospective students', type: 'textarea' },
    ],
  },
  { id: 'career', group: 'Profile lists', title: 'Career', kind: 'list', help: 'Appointments, newest first.', fields: [{ name: 'period', label: 'Period' }, { name: 'org', label: 'Organisation' }, { name: 'role', label: 'Role' }, { name: 'current', label: 'Current position', type: 'checkbox' }], itemLabel: (r) => `${r.period} · ${r.org}` },
  { id: 'education', group: 'Profile lists', title: 'Education', kind: 'list', help: 'Degrees.', fields: [{ name: 'period', label: 'Period' }, { name: 'org', label: 'Institution' }, { name: 'degree', label: 'Degree' }], itemLabel: (r) => `${r.period} · ${r.org}` },
  { id: 'profileLinks', group: 'Profile lists', title: 'Profile links', kind: 'list', help: 'researchmap, ORCID, Google Scholar …', fields: [{ name: 'label', label: 'Label' }, { name: 'url', label: 'URL' }], itemLabel: (r) => r.label },
  { id: 'researchThemes', group: 'Research & teaching', title: 'Research themes', kind: 'list', help: 'Shown on the Research and Home pages.', fields: [{ name: 'num', label: 'Number' }, { name: 'title', label: 'Title' }, { name: 'body', label: 'Description', type: 'textarea' }, { name: 'example', label: 'Representative work' }], itemLabel: (r) => r.title },
  { id: 'fieldSites', group: 'Research & teaching', title: 'Field sites', kind: 'list', help: 'Where the seminar works.', fields: [{ name: 'place', label: 'Place' }, { name: 'note', label: 'Note' }], itemLabel: (r) => r.place },
  { id: 'courses', group: 'Research & teaching', title: 'Courses', kind: 'list', help: 'Teaching page.', fields: [{ name: 'level', label: 'Level' }, { name: 'title', label: 'Course' }, { name: 'body', label: 'Description', type: 'textarea' }], itemLabel: (r) => r.title },
  { id: 'seminarLife', group: 'Research & teaching', title: 'Seminar life', kind: 'list', help: 'Teaching page.', fields: [{ name: 'title', label: 'Title' }, { name: 'body', label: 'Text', type: 'textarea' }], itemLabel: (r) => r.title },
  { id: 'joinPoints', group: 'Research & teaching', title: 'Why join', kind: 'list', help: 'Teaching page.', fields: [{ name: 'title', label: 'Title' }, { name: 'body', label: 'Text', type: 'textarea' }], itemLabel: (r) => r.title },
  { id: 'partnerLinks', group: 'Research & teaching', title: 'Partner links', kind: 'list', help: 'Contact page.', fields: [{ name: 'label', label: 'Label' }, { name: 'url', label: 'URL' }], itemLabel: (r) => r.label },
];

function Input({ f, value, onChange }: { f: F; value: any; onChange: (v: any) => void }) {
  if (f.type === 'image') return <FileField label={f.label} value={value || null} onChange={(k) => onChange(k ?? '')} target={{ area: 'site', folder: 'content' }} hint={f.hint} />;
  if (f.type === 'checkbox') return <label className="check"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {f.label}</label>;
  if (f.type === 'textarea') return <Field label={f.label} hint={f.hint}><textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} /></Field>;
  if (f.type === 'number') return <Field label={f.label} hint={f.hint}><input type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} /></Field>;
  return <Field label={f.label} hint={f.hint}><input type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} /></Field>;
}

function BlockEditor({ block, stored, onSaved }: { block: Block; stored?: SiteContent; onSaved: () => void }) {
  const toast = useToast();
  const fallback = DEFAULTS[block.id] as any;
  const initial = useMemo(() => {
    const v = parseJson<any>(stored?.data, fallback);
    return block.kind === 'object' ? { ...fallback, ...v } : v;
  }, [stored?.data, fallback, block.kind]);
  const [value, setValue] = useState<any>(initial);
  const [open, setOpen] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => setValue(initial), [initial]);
  const dirty = JSON.stringify(value) !== JSON.stringify(initial);

  const save = async (v = value) => {
    setSaving(true);
    try {
      const data = JSON.stringify(v);
      const existing = unwrap(await userClient.models.SiteContent.get({ id: block.id }));
      if (existing) unwrap(await userClient.models.SiteContent.update({ id: block.id, data }));
      else unwrap(await userClient.models.SiteContent.create({ id: block.id, data }));
      changed('SiteContent', 'update', block.id, block.title);
      toast(`${block.title} saved — live on the website.`);
      onSaved();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };

  const rows: any[] = Array.isArray(value) ? value : [];
  const setRow = (i: number, name: string, v: any) => setValue(rows.map((r, j) => (j === i ? { ...r, [name]: v } : r)));
  const move = (i: number, d: number) => {
    const next = [...rows];
    const [x] = next.splice(i, 1);
    next.splice(Math.max(0, Math.min(next.length, i + d)), 0, x);
    setValue(next);
    setOpen(null);
  };

  return (
    <div className="panel">
      <div className="spread">
        <div>
          <h3 style={{ margin: 0 }}>{block.title}</h3>
          <p className="small muted" style={{ margin: '4px 0 0' }}>{block.help}</p>
        </div>
        <div className="row">
          {!stored && <span className="tag grey">Using default text</span>}
          {dirty && <span className="tag gold">Unsaved changes</span>}
          <button className="btn ghost sm" onClick={() => confirm('Restore the original default for this block?') && setValue(fallback)}>Restore default</button>
          <button className="btn" disabled={saving || !dirty} onClick={() => save()}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        {block.kind === 'object' ? (
          <div className="form">
            {block.fields.map((f) => (
              <Input key={f.name} f={f} value={value[f.name]} onChange={(v) => setValue({ ...value, [f.name]: v })} />
            ))}
          </div>
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            {rows.map((r, i) => (
              <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 6, background: open === i ? '#fff' : 'var(--paper)' }}>
                <div className="spread" style={{ padding: '8px 12px', cursor: 'pointer' }} onClick={() => setOpen(open === i ? null : i)}>
                  <span><span className="muted small">{i + 1}.</span> {block.itemLabel?.(r) ?? `Item ${i + 1}`}</span>
                  <span className="row" style={{ gap: 4 }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn ghost sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                    <button className="btn ghost sm" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down">↓</button>
                    <button className="btn ghost sm" onClick={() => setOpen(open === i ? null : i)}>{open === i ? 'Close' : 'Edit'}</button>
                    <button className="btn ghost sm" style={{ color: 'var(--danger)' }} onClick={() => { setValue(rows.filter((_, j) => j !== i)); setOpen(null); }}>Remove</button>
                  </span>
                </div>
                {open === i && (
                  <div className="form" style={{ padding: '4px 12px 14px' }}>
                    {block.fields.map((f) => <Input key={f.name} f={f} value={r[f.name]} onChange={(v) => setRow(i, f.name, v)} />)}
                  </div>
                )}
              </div>
            ))}
            <div>
              <button className="btn secondary sm" onClick={() => { setValue([...rows, Object.fromEntries(block.fields.map((f) => [f.name, f.type === 'checkbox' ? false : '']))]); setOpen(rows.length); }}>+ Add</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SiteContentAdmin() {
  const { items, loading, reload } = useLiveModel<SiteContent>('SiteContent');
  const groups = [...new Set(BLOCKS.map((b) => b.group))];
  const [group, setGroup] = useState(groups[0]);
  return (
    <>
      <h1>Site content</h1>
      <p className="muted">Everything on the website that is not a news post, member or publication: the cover page, headlines, tiles, profile text, contact details and lists. Changes go live as soon as you save.</p>
      <div className="tabs">
        {groups.map((g) => <button key={g} className={group === g ? 'active' : ''} onClick={() => setGroup(g)}>{g}</button>)}
      </div>
      {loading ? <Loading /> : BLOCKS.filter((b) => b.group === group).map((b) => <BlockEditor key={b.id} block={b} stored={items.find((i) => i.id === b.id)} onSaved={reload} />)}
    </>
  );
}
