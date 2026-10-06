/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link } from 'react-router-dom';
import { parseJson } from '../../lib/amplify';
import { academicYear, ALBUM_CATEGORIES, CATEGORY_LABELS, formatDate, KIND_SINGULAR, slugify, today, uniqueSlug } from '../../lib/format';
import { Img } from '../../components/ui';
import { CrudManager, type CrudConfig } from './crud';

const opts = (m: Record<string, string>) => Object.entries(m).map(([value, label]) => ({ value, label }));
const withSlug = (input: Record<string, any>, all: any[], existing: any, from: string) => {
  const wanted = slugify(input.slug || input[from] || '');
  const taken = all.filter((x) => x.id !== existing?.id).map((x) => x.slug);
  return { ...input, slug: uniqueSlug(wanted, taken) };
};
const thumb = (k?: string | null) => (
  <div style={{ width: 64, height: 44, borderRadius: 3, overflow: 'hidden', background: 'var(--teal-50)' }}>
    <Img k={k} alt="" />
  </div>
);
const importLink = (type: string) => () => (
  <Link className="btn secondary" to={`/admin/import?type=${type}`}>Import CSV</Link>
);

const posts: CrudConfig = {
  model: 'Post',
  title: 'News & events',
  singular: 'Post',
  intro: 'News, events, student activities, internships and conference reports. Student submissions you approve also appear here.',
  label: (p) => p.title,
  searchText: (p) => [p.title, p.titleJa, p.excerpt, p.authorName, p.location].join(' '),
  sort: (a, b) => (b.publishDate ?? '').localeCompare(a.publishDate ?? ''),
  filters: [
    { label: 'Published', test: (p) => p.published },
    { label: 'Drafts', test: (p) => !p.published },
    { label: 'Events', test: (p) => p.category === 'EVENT' },
    { label: 'Student activities', test: (p) => ['STUDENT_ACTIVITY', 'INTERNSHIP', 'FIELDWORK'].includes(p.category) },
  ],
  defaults: () => ({ category: 'NEWS', publishDate: today(), published: true }),
  beforeSave: (input, all, existing) => withSlug({ ...input, publishDate: input.publishDate || today() }, all, existing, 'title'),
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'titleJa', label: 'Title (日本語)', type: 'text' },
    { name: 'category', label: 'Category', type: 'select', options: opts(CATEGORY_LABELS), required: true, half: true },
    { name: 'publishDate', label: 'Publish date', type: 'date', half: true },
    { name: 'eventDate', label: 'Event date (for events)', type: 'date', half: true },
    { name: 'location', label: 'Location', type: 'text', half: true },
    { name: 'excerpt', label: 'Summary (shown on cards)', type: 'textarea' },
    { name: 'body', label: 'Full text', type: 'markdown' },
    { name: 'coverKey', label: 'Cover photo', type: 'image', folder: 'news' },
    { name: 'imageKeys', label: 'Photo gallery', type: 'images', folder: 'news', store: 'keys' },
    { name: 'memberIds', label: 'Seminar members featured', type: 'members' },
    { name: 'authorName', label: 'Author', type: 'text', half: true },
    { name: 'slug', label: 'Web address (leave blank to generate)', type: 'text', half: true },
    { name: 'published', label: 'Published (visible on the website)', type: 'checkbox', half: true },
    { name: 'pinned', label: 'Pin to top of news', type: 'checkbox', half: true },
  ],
  columns: [
    { label: '', width: 72, render: (p) => thumb(p.coverKey ?? p.imageKeys?.[0]) },
    { label: 'Title', render: (p) => <><b>{p.title}</b><div className="small muted">/news/{p.slug}</div></> },
    { label: 'Category', render: (p) => <span className="tag">{CATEGORY_LABELS[p.category] ?? '—'}</span> },
    { label: 'Date', render: (p) => <span className="small">{formatDate(p.publishDate)}</span> },
    { label: 'Status', render: (p) => (p.published ? <span className="tag ok">Live</span> : <span className="tag grey">Draft</span>) },
  ],
};

const publications: CrudConfig = {
  model: 'Publication',
  title: 'Publications',
  singular: 'Publication',
  label: (p) => p.title,
  searchText: (p) => [p.title, p.venue, p.authors, p.doi, p.year].join(' '),
  sort: (a, b) => b.year - a.year || (b.date ?? '').localeCompare(a.date ?? ''),
  filters: Object.entries(KIND_SINGULAR).map(([k, v]) => ({ label: v, test: (p: any) => p.kind === k })),
  defaults: () => ({ kind: 'PAPER', year: new Date().getFullYear() }),
  toolbar: importLink('publications'),
  fields: [
    { name: 'kind', label: 'Type', type: 'select', options: opts(KIND_SINGULAR), required: true, half: true },
    { name: 'year', label: 'Year', type: 'number', required: true, half: true },
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'authors', label: 'Authors', type: 'text' },
    { name: 'venue', label: 'Journal / conference / publisher', type: 'text' },
    { name: 'date', label: 'Date (free text, e.g. 26 Jun 2026)', type: 'text', half: true },
    { name: 'doi', label: 'DOI', type: 'text', half: true },
    { name: 'url', label: 'Link', type: 'url' },
    { name: 'note', label: 'Note (e.g. Peer-reviewed · First author)', type: 'text' },
    { name: 'peerReviewed', label: 'Peer-reviewed', type: 'checkbox', half: true },
    { name: 'invited', label: 'Invited', type: 'checkbox', half: true },
    { name: 'featured', label: 'Feature on home page', type: 'checkbox' },
    { name: 'pdfKey', label: 'PDF (only if sharing is permitted)', type: 'file', folder: 'publications' },
    { name: 'memberIds', label: 'Seminar members (co-authors)', type: 'members' },
  ],
  columns: [
    { label: 'Year', width: 60, render: (p) => p.year },
    { label: 'Type', render: (p) => <span className="tag grey">{KIND_SINGULAR[p.kind]}</span> },
    { label: 'Title', render: (p) => <><b>{p.title}</b><div className="small muted">{p.venue}</div></> },
    { label: 'DOI', render: (p) => (p.doi ? <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer" className="small">{p.doi}</a> : '') },
  ],
};

const projects: CrudConfig = {
  model: 'Project',
  title: 'Research projects',
  singular: 'Project',
  label: (p) => p.titleEn,
  searchText: (p) => [p.titleEn, p.titleJa, p.funder, p.host].join(' '),
  sort: (a, b) => Number(!!b.ongoing) - Number(!!a.ongoing) || (a.sortOrder ?? 100) - (b.sortOrder ?? 100),
  filters: [
    { label: 'Ongoing', test: (p) => p.ongoing },
    { label: 'Completed', test: (p) => !p.ongoing },
  ],
  defaults: () => ({ ongoing: true, role: 'Principal Investigator', sortOrder: 100 }),
  fields: [
    { name: 'titleEn', label: 'Title (English)', type: 'text', required: true },
    { name: 'titleJa', label: 'Title (日本語)', type: 'text' },
    { name: 'funder', label: 'Funder / programme', type: 'text', half: true },
    { name: 'role', label: 'Role', type: 'select', options: [{ value: 'Principal Investigator', label: 'Principal Investigator' }, { value: 'Co-investigator', label: 'Co-investigator' }, { value: 'Collaborator', label: 'Collaborator' }], half: true },
    { name: 'period', label: 'Period (e.g. Apr 2026 – Mar 2030)', type: 'text', half: true },
    { name: 'host', label: 'Host institution', type: 'text', half: true },
    { name: 'summary', label: 'Summary', type: 'textarea' },
    { name: 'coverKey', label: 'Image', type: 'image', folder: 'projects' },
    { name: 'ongoing', label: 'Ongoing', type: 'checkbox', half: true },
    { name: 'sortOrder', label: 'Display order (lower first)', type: 'number', half: true },
  ],
  columns: [
    { label: 'Project', render: (p) => <><b>{p.titleEn}</b><div className="small muted">{p.titleJa}</div></> },
    { label: 'Funder', render: (p) => <span className="small">{p.funder}</span> },
    { label: 'Role', render: (p) => <span className="small">{p.role}</span> },
    { label: 'Period', render: (p) => <span className="small">{p.period}</span> },
  ],
};

const awards: CrudConfig = {
  model: 'Award',
  title: 'Awards',
  singular: 'Award',
  label: (a) => a.title,
  searchText: (a) => [a.title, a.body, a.recipients, a.note].join(' '),
  sort: (a, b) => (b.year ?? 0) - (a.year ?? 0),
  defaults: () => ({ year: new Date().getFullYear(), recipients: 'Aiko Sakurai' }),
  fields: [
    { name: 'title', label: 'Award', type: 'text', required: true },
    { name: 'body', label: 'Awarded by', type: 'text' },
    { name: 'date', label: 'Date (e.g. December 2025)', type: 'text', half: true },
    { name: 'year', label: 'Year', type: 'number', half: true },
    { name: 'recipients', label: 'Recipients', type: 'text' },
    { name: 'note', label: 'Note', type: 'textarea' },
  ],
  columns: [
    { label: 'Year', width: 60, render: (a) => a.year },
    { label: 'Award', render: (a) => <><b>{a.title}</b><div className="small muted">{a.body}</div></> },
    { label: 'Recipients', render: (a) => <span className="small">{a.recipients}</span> },
  ],
};

const albums: CrudConfig = {
  model: 'Album',
  title: 'Gallery albums',
  singular: 'Album',
  intro: 'Create an album (e.g. “Internship AY 2025”), then drop in as many photos as you like — they upload in parallel and are resized automatically.',
  label: (a) => a.title,
  searchText: (a) => [a.title, a.category, a.description, a.academicYear].join(' '),
  sort: (a, b) => (b.academicYear ?? 0) - (a.academicYear ?? 0) || (b.date ?? '').localeCompare(a.date ?? ''),
  defaults: () => ({ academicYear: academicYear(today()), date: today(), category: 'Seminar', published: true, photos: '[]' }),
  beforeSave: (input, all, existing) => withSlug({ ...input, academicYear: input.academicYear ?? academicYear(input.date) }, all, existing, 'title'),
  fields: [
    { name: 'title', label: 'Album title', type: 'text', required: true },
    { name: 'category', label: 'Category', type: 'select', options: ALBUM_CATEGORIES.map((c) => ({ value: c, label: c })), half: true },
    { name: 'academicYear', label: 'Academic year (April–March)', type: 'number', half: true, hint: 'AY 2025 = April 2025 – March 2026' },
    { name: 'date', label: 'Date', type: 'date', half: true },
    { name: 'published', label: 'Visible on the website', type: 'checkbox', half: true },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'photos', label: 'Photos', type: 'images', folder: 'gallery', store: 'json' },
    { name: 'coverKey', label: 'Cover (optional — first photo is used otherwise)', type: 'image', folder: 'gallery' },
    { name: 'slug', label: 'Web address (leave blank to generate)', type: 'text' },
  ],
  columns: [
    { label: '', width: 72, render: (a) => thumb(a.coverKey ?? parseJson<{ key: string }[]>(a.photos, [])[0]?.key) },
    { label: 'Album', render: (a) => <><b>{a.title}</b><div className="small muted">{a.category}</div></> },
    { label: 'AY', render: (a) => (a.academicYear ? `AY ${a.academicYear}` : '') },
    { label: 'Photos', render: (a) => parseJson<unknown[]>(a.photos, []).length },
    { label: 'Status', render: (a) => (a.published !== false ? <span className="tag ok">Live</span> : <span className="tag grey">Hidden</span>) },
  ],
};

const guests: CrudConfig = {
  model: 'Guest',
  title: 'Visitors (guest scholars)',
  singular: 'Visitor',
  intro: 'Scholars and practitioners who visited the seminar. They are grouped by country on the public Visitors page.',
  label: (g) => g.name,
  searchText: (g) => [g.name, g.affiliation, g.position, g.country].join(' '),
  sort: (a, b) => (a.country ?? '').localeCompare(b.country ?? '') || a.name.localeCompare(b.name),
  defaults: () => ({ country: 'Japan' }),
  toolbar: importLink('guests'),
  fields: [
    { name: 'name', label: 'Name (with title, e.g. Dr. …)', type: 'text', required: true },
    { name: 'position', label: 'Position', type: 'text', half: true },
    { name: 'affiliation', label: 'Organisation', type: 'text', half: true },
    { name: 'country', label: 'Country', type: 'text', half: true },
    { name: 'visitDate', label: 'Visit date', type: 'date', half: true },
    { name: 'note', label: 'Note (e.g. lecture title)', type: 'textarea' },
    { name: 'photoKey', label: 'Photo', type: 'image', folder: 'visitors' },
  ],
  columns: [
    { label: 'Name', render: (g) => <b>{g.name}</b> },
    { label: 'Position', render: (g) => <span className="small">{[g.position, g.affiliation].filter(Boolean).join(', ')}</span> },
    { label: 'Country', render: (g) => g.country },
    { label: 'Visit', render: (g) => <span className="small">{formatDate(g.visitDate)}</span> },
  ],
};

export const PostsAdmin = () => <CrudManager config={posts} />;
export const PublicationsAdmin = () => <CrudManager config={publications} />;
export const ProjectsAdmin = () => <CrudManager config={projects} />;
export const AwardsAdmin = () => <CrudManager config={awards} />;
export const AlbumsAdmin = () => <CrudManager config={albums} />;
export const GuestsAdmin = () => <CrudManager config={guests} />;
