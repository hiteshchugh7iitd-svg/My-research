/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { parseJson, userClient, unwrap, type SiteContent } from '../../lib/amplify';
import { changed } from '../../lib/audit';
import { DEFAULTS, type ContentId } from '../../lib/defaults';
import { download, parseCsv, toCsv } from '../../lib/csv';
import { toJa } from '../../lib/ja';
import { Field, FileField } from '../../components/fields';
import { Loading, useToast } from '../../components/ui';
import { useLiveModel } from './crud';

type F = { name: string; label: string; type?: 'text' | 'textarea' | 'image' | 'checkbox' | 'number'; hint?: string };
type Block = { id: ContentId; title: string; group: string; help: string; kind: 'object' | 'list'; fields: F[]; itemLabel?: (row: any) => string };

const RAW_BLOCKS: Block[] = [
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
      { name: 'showPortrait', label: 'Show Prof. Sakurai’s portrait on the cover (set the photo under Pages → Prof. Sakurai profile)', type: 'checkbox' },
      { name: 'showProfileButtons', label: 'Show researchmap / ORCID / ResearchGate buttons on the cover (from Profile lists → Profile links)', type: 'checkbox' },
      { name: 'profileButtonCount', label: 'Number of profile buttons on the cover', type: 'number' },
      { name: 'showPillars', label: 'Show Research / Education / Outreach blocks', type: 'checkbox' },
      { name: 'researchText', label: 'Research block text', type: 'textarea' },
      { name: 'educationText', label: 'Education block text', type: 'textarea' },
      { name: 'outreachText', label: 'Outreach block text', type: 'textarea' },
      { name: 'showWhatsNew', label: 'Show “What’s New”', type: 'checkbox' },
      { name: 'whatsNewHeading', label: '“What’s New” heading' },
      { name: 'whatsNewCount', label: 'Number of “What’s New” lines', type: 'number' },
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
      { name: 'showPartners', label: 'Show partner logos', type: 'checkbox' },
      { name: 'partnersHeading', label: 'Partners heading' },
      { name: 'showFields', label: 'Show “Fields” photo strip', type: 'checkbox' },
      { name: 'fieldsHeading', label: '“Fields” heading' },
    ],
  },
  {
    id: 'whatsNew', group: 'Home page', title: 'What’s New', kind: 'list',
    help: 'Short dated one-line updates (new paper, talk, award, visit). The newest dates are shown first.',
    fields: [
      { name: 'date', label: 'Date (YYYY-MM-DD)' },
      { name: 'text', label: 'Text', type: 'textarea' },
      { name: 'link', label: 'Link (optional, e.g. /news/my-post or https://…)' },
    ],
    itemLabel: (r) => `${r.date} · ${String(r.text ?? '').slice(0, 70)}`,
  },
  {
    id: 'partners', group: 'Home page', title: 'Partner logos', kind: 'list',
    help: 'Logo row near the bottom of the home page. Without a logo the name is shown in a box.',
    fields: [{ name: 'name', label: 'Organisation name' }, { name: 'logo', label: 'Logo (optional)', type: 'image' }, { name: 'url', label: 'Website' }],
    itemLabel: (r) => r.name || 'Partner',
  },
  {
    id: 'fieldStrip', group: 'Home page', title: '“Fields” photo strip', kind: 'list',
    help: 'One photo per country at the bottom of the home page.',
    fields: [{ name: 'country', label: 'Country / place' }, { name: 'image', label: 'Photo (optional)', type: 'image' }, { name: 'link', label: 'Link (default: /research#fields)' }],
    itemLabel: (r) => r.country || 'Field',
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
  {
    id: 'policyAdvocacy', group: 'Research pages', title: 'Policy advocacy', kind: 'list',
    help: 'Research → Policy advocacy page: advisory work for governments, UNESCO, UNICEF and others. The page appears in the menu once it has at least one entry.',
    fields: [{ name: 'title', label: 'Title' }, { name: 'period', label: 'Period / year' }, { name: 'body', label: 'Description', type: 'textarea' }, { name: 'image', label: 'Photo (optional)', type: 'image' }, { name: 'link', label: 'Link (optional)' }],
    itemLabel: (r) => r.title || 'Entry',
  },
  {
    id: 'bookCovers', group: 'Research pages', title: 'Book covers', kind: 'list',
    help: 'Cover gallery at the top of the Publications page (All and Books tabs).',
    fields: [{ name: 'title', label: 'Book title' }, { name: 'image', label: 'Cover image', type: 'image' }, { name: 'link', label: 'Link to the publisher (optional)' }],
    itemLabel: (r) => r.title || 'Book',
  },
  {
    id: 'thesisStats', group: 'Education pages', title: 'Thesis supervision — headline numbers', kind: 'list',
    help: 'Boxes at the top of Education → Thesis supervision, e.g. “PhD theses supervised — 5”.',
    fields: [{ name: 'label', label: 'Label' }, { name: 'value', label: 'Number' }],
    itemLabel: (r) => `${r.label} — ${r.value}`,
  },
  {
    id: 'theses', group: 'Education pages', title: 'Thesis supervision — list', kind: 'list',
    help: 'One row per thesis. Rows are grouped by university and level (PhD / Master / Bachelor). Tip: use “Download CSV”, fill it in Excel and “Import CSV”.',
    fields: [{ name: 'university', label: 'University' }, { name: 'level', label: 'Level (PhD, Master, Bachelor)' }, { name: 'year', label: 'Year' }, { name: 'name', label: 'Student name' }, { name: 'country', label: 'Country' }, { name: 'title', label: 'Thesis title', type: 'textarea' }],
    itemLabel: (r) => `${r.year} · ${r.name} · ${r.level}`,
  },
  {
    id: 'mediaCoverage', group: 'Outreach pages', title: 'Media coverage', kind: 'list',
    help: 'Outreach → Media coverage: newspaper, TV and web. Add a scan of the clipping as the image if you have one.',
    fields: [{ name: 'date', label: 'Date (YYYY-MM-DD)' }, { name: 'outlet', label: 'Newspaper / channel' }, { name: 'title', label: 'Headline' }, { name: 'link', label: 'Link (optional)' }, { name: 'image', label: 'Clipping image (optional)', type: 'image' }],
    itemLabel: (r) => `${r.date} · ${r.outlet}`,
  },
  {
    id: 'outreachMemberships', group: 'Outreach pages', title: 'Committees & memberships', kind: 'list',
    help: 'Outreach → Activities: committees, societies, editorial boards and advisory roles.',
    fields: [{ name: 'text', label: 'Role and organisation', type: 'textarea' }, { name: 'period', label: 'Period' }],
    itemLabel: (r) => String(r.text ?? '').slice(0, 80),
  },
  {
    id: 'outreachStories', group: 'Outreach pages', title: 'Social contribution', kind: 'list',
    help: 'Outreach → Activities: workshops, school visits, public lectures and training, with an optional photo.',
    fields: [{ name: 'title', label: 'Title' }, { name: 'body', label: 'Text', type: 'textarea' }, { name: 'image', label: 'Photo (optional)', type: 'image' }],
    itemLabel: (r) => r.title || 'Story',
  },
  {
    id: 'pageText', group: 'Page titles & intros', title: 'Page titles and introductions', kind: 'list',
    help: 'Replace the title and introduction shown in the coloured band at the top of each page. Leave a box empty to keep the built-in text.',
    fields: [{ name: 'page', label: 'Page' }, { name: 'path', label: 'Address (do not change)' }, { name: 'title', label: 'Title' }, { name: 'intro', label: 'Introduction', type: 'textarea' }],
    itemLabel: (r) => `${r.page} (${r.path})${r.title || r.intro ? ' — edited' : ''}`,
  },
];

/** Fields that are not translated (links, numbers, images, ids). */
const NO_JA = new Set(['image', 'photo', 'link', 'url', 'email', 'phone', 'mapUrl', 'instagram', 'num', 'period', 'name', 'newsCount', 'ctaPrimaryLink', 'ctaSecondaryLink', 'logo', 'path', 'date', 'year', 'value', 'profileButtonCount', 'whatsNewCount', 'page']);

/** Adds a “(日本語)” twin after every translatable text field so each can be edited in both languages. */
function withJa(fields: F[]): F[] {
  const names = new Set(fields.map((f) => f.name));
  const out: F[] = [];
  for (const f of fields) {
    out.push(f);
    const translatable = (!f.type || f.type === 'text' || f.type === 'textarea') && !NO_JA.has(f.name) && !f.name.endsWith('Ja') && !names.has(f.name + 'Ja');
    if (translatable) out.push({ ...f, name: f.name + 'Ja', label: `${f.label} (日本語)`, hint: undefined });
  }
  return out;
}

const BLOCKS: Block[] = RAW_BLOCKS.map((b) => ({ ...b, fields: withJa(b.fields) }));

/** Pre-fills empty Japanese fields with the built-in translation so it can be reviewed and edited. */
function fillJa(block: Block, row: any): any {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  for (const f of block.fields) {
    if (!f.name.endsWith('Ja')) continue;
    const en = out[f.name.slice(0, -2)];
    if (!out[f.name] && typeof en === 'string' && en) {
      const ja = toJa(en);
      if (ja !== en) out[f.name] = ja;
    }
  }
  return out;
}

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
    if (block.kind === 'object') return fillJa(block, { ...fallback, ...v });
    return (Array.isArray(v) ? v : fallback).map((r: any) => fillJa(block, r));
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
  const fileRef = useRef<HTMLInputElement>(null);
  const columns = block.fields.map((f) => f.name);
  const exportCsv = () => download(`${block.id}.csv`, '\ufeff' + toCsv(rows.length ? rows : [Object.fromEntries(columns.map((c) => [c, '']))], columns), 'text/csv');
  const importCsv = async (file?: File) => {
    if (!file) return;
    const parsed = parseCsv(await file.text());
    if (!parsed.length) return toast('The CSV file has no rows.', true);
    const known = new Set(columns);
    const imported = parsed.map((r) =>
      Object.fromEntries(
        Object.entries(r)
          .filter(([k]) => known.has(k))
          .map(([k, v]) => [k, block.fields.find((f) => f.name === k)?.type === 'checkbox' ? /^(true|yes|1)$/i.test(v) : v]),
      ),
    );
    const replace = confirm(`${imported.length} rows read. OK = replace the current ${rows.length} rows, Cancel = add them at the end.`);
    setValue(replace ? imported : [...rows, ...imported]);
    toast('Rows loaded. Check them, then click Save.');
  };
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
          {block.kind === 'list' && (
            <>
              <button className="btn ghost sm" onClick={exportCsv}>Download CSV</button>
              <button className="btn ghost sm" onClick={() => fileRef.current?.click()}>Import CSV</button>
              <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { void importCsv(e.target.files?.[0]); e.target.value = ''; }} />
            </>
          )}
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
  const [params, setParams] = useSearchParams();
  const group = groups.includes(params.get('group') ?? '') ? (params.get('group') as string) : groups[0];
  const setGroup = (g: string) => setParams({ group: g }, { replace: true });
  return (
    <>
      <h1>Site content (all pages)</h1>
      <p className="muted">Every part of the website that is not a news post, student, publication, project, award, album or visitor: the cover page, headlines, What’s New, partner logos, profile text, Policy advocacy, Thesis supervision, Media coverage, Outreach, and the title and introduction of every page. Each text has a (日本語) box for the Japanese version. Changes go live as soon as you save.</p>
      <div className="tabs">
        {groups.map((g) => <button key={g} className={group === g ? 'active' : ''} onClick={() => setGroup(g)}>{g}</button>)}
      </div>
      {loading ? <Loading /> : BLOCKS.filter((b) => b.group === group).map((b) => <BlockEditor key={b.id} block={b} stored={items.find((i) => i.id === b.id)} onSaved={reload} />)}
    </>
  );
}
