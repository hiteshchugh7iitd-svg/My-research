export const PROGRAM_LABELS: Record<string, string> = {
  PHD: 'Doctoral (PhD)',
  MASTERS: "Master's",
  RESEARCH_STUDENT: 'Research student',
  EXCHANGE: 'Exchange student',
  UNDERGRADUATE: 'Undergraduate',
  POSTDOC: 'Postdoctoral researcher',
  VISITING_RESEARCHER: 'Visiting researcher',
};
export const PROGRAM_ORDER = ['POSTDOC', 'VISITING_RESEARCHER', 'PHD', 'MASTERS', 'RESEARCH_STUDENT', 'EXCHANGE', 'UNDERGRADUATE'];

export const STATUS_LABELS: Record<string, string> = { CURRENT: 'Current', ALUMNI: 'Alumni', ON_LEAVE: 'On leave' };

export const CATEGORY_LABELS: Record<string, string> = {
  NEWS: 'News',
  EVENT: 'Event',
  STUDENT_ACTIVITY: 'Student activity',
  INTERNSHIP: 'Internship',
  FIELDWORK: 'Fieldwork',
  CONFERENCE: 'Conference',
  AWARD: 'Award',
  SEMINAR: 'Seminar',
  PUBLICATION_NEWS: 'New publication',
};

export const KIND_LABELS: Record<string, string> = { PAPER: 'Papers', BOOK: 'Books & chapters', REPORT: 'Reports & proceedings', TALK: 'Talks & presentations' };
export const KIND_SINGULAR: Record<string, string> = { PAPER: 'Paper', BOOK: 'Book / chapter', REPORT: 'Report', TALK: 'Talk' };

export const ALBUM_CATEGORIES = ['Seminar', 'Internship', 'Field study', 'Conference', 'Graduation', 'Event', 'Study visit', 'Other'];

export function slugify(text: string): string {
  const base = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || Math.random().toString(36).slice(2, 8);
}

/** Makes `slug` unique among `taken` by appending -2, -3 … */
export function uniqueSlug(slug: string, taken: Iterable<string>): string {
  const set = new Set(taken);
  if (!set.has(slug)) return slug;
  let n = 2;
  while (set.has(`${slug}-${n}`)) n++;
  return `${slug}-${n}`;
}

export function formatDate(iso?: string | null, opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }): string {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', opts);
}

export const today = () => new Date().toISOString().slice(0, 10);

/** Japanese academic year (April–March) that a date falls in. */
export function academicYear(iso?: string | null): number | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.getMonth() < 3 ? d.getFullYear() - 1 : d.getFullYear();
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Lower-cased, accent-free, punctuation-free text used for matching names and titles. */
export function normalize(text: string | null | undefined): string {
  return (text ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
