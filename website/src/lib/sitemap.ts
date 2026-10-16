import type { ContentId } from './defaults';

/**
 * Site structure, modelled on research-group sites with a Research / Education / Outreach split.
 * Pages tied to a content block are hidden from visitors while that block is empty
 * (staff still see them, so they can fill them in).
 */
export type NavChild = { to: string; label: string; needs?: ContentId[] };
export type Pillar = { key: string; label: string; children: NavChild[] };

export const PILLARS: Pillar[] = [
  {
    key: 'research',
    label: 'Research',
    children: [
      { to: '/research', label: 'Themes & projects' },
      { to: '/publications', label: 'Publications' },
      { to: '/advocacy', label: 'Policy advocacy', needs: ['policyAdvocacy'] },
    ],
  },
  {
    key: 'education',
    label: 'Education',
    children: [
      { to: '/teaching', label: 'Courses' },
      { to: '/thesis', label: 'Thesis supervision', needs: ['theses', 'thesisStats'] },
      { to: '/members', label: 'Students' },
      { to: '/alumni', label: 'Alumni' },
    ],
  },
  {
    key: 'outreach',
    label: 'Outreach',
    children: [
      { to: '/outreach', label: 'Activities' },
      { to: '/media', label: 'Media coverage', needs: ['mediaCoverage'] },
      { to: '/visitors', label: 'Visitors' },
      { to: '/gallery', label: 'Gallery' },
    ],
  },
];

/** Finds the pillar and page that a path belongs to (detail pages count as their list page). */
export function locate(pathname: string): { pillar?: Pillar; child?: NavChild } {
  for (const pillar of PILLARS) {
    const child = pillar.children.find((c) => pathname === c.to || pathname.startsWith(c.to + '/'));
    if (child) return { pillar, child };
  }
  return {};
}
