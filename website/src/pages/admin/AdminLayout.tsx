import { NavLink, Outlet, useLocation } from 'react-router-dom';
import type { Submission } from '../../lib/amplify';
import { useAuth } from '../../lib/auth';
import { useLiveModel } from './crud';

const SECTIONS: { title: string; links: { to: string; label: string; professorOnly?: boolean; badge?: boolean }[] }[] = [
  { title: 'Overview', links: [{ to: '/admin', label: 'Dashboard' }, { to: '/admin/submissions', label: 'Submissions', badge: true }] },
  {
    title: 'People',
    links: [
      { to: '/admin/members', label: 'Students & alumni' },
      { to: '/admin/visitors', label: 'Visitors' },
      { to: '/admin/accounts', label: 'Accounts & roles' },
    ],
  },
  {
    title: 'Content',
    links: [
      { to: '/admin/posts', label: 'News & events' },
      { to: '/admin/gallery', label: 'Gallery' },
      { to: '/admin/publications', label: 'Publications' },
      { to: '/admin/projects', label: 'Research projects' },
      { to: '/admin/awards', label: 'Awards' },
    ],
  },
  {
    title: 'Site content (all pages)',
    links: [
      { to: '/admin/content?group=Home page', label: 'Home page & cover' },
      { to: '/admin/content?group=Pages', label: 'Profile & contact' },
      { to: '/admin/content?group=Profile lists', label: 'Career & profile links' },
      { to: '/admin/content?group=Research & teaching', label: 'Research & teaching text' },
      { to: '/admin/content?group=Research pages', label: 'Policy advocacy & books' },
      { to: '/admin/content?group=Education pages', label: 'Thesis supervision' },
      { to: '/admin/content?group=Outreach pages', label: 'Media & outreach' },
      { to: '/admin/content?group=Page titles & intros', label: 'Page titles & intros' },
    ],
  },
  {
    title: 'Data',
    links: [
      { to: '/admin/uploads', label: 'Upload center' },
      { to: '/admin/import', label: 'Import & export' },
      { to: '/admin/activity', label: 'Activity log' },
    ],
  },
];

export default function AdminLayout() {
  const auth = useAuth();
  const { items } = useLiveModel<Submission>('Submission');
  const pending = items.filter((s) => s.status === 'PENDING').length;
  const location = useLocation();
  // Links with ?group= all share one path, so compare the query string too.
  const active = (to: string, isActive: boolean) => {
    if (!to.includes('?')) return isActive;
    const [path, query] = to.split('?');
    const group = new URLSearchParams(location.search).get('group') ?? 'Home page';
    return location.pathname === path && new URLSearchParams(query).get('group') === group;
  };
  return (
    <div className="admin">
      <nav className="admin-nav" aria-label="Admin">
        {SECTIONS.map((s) => (
          <div key={s.title} style={{ display: 'contents' }}>
            <h5>{s.title}</h5>
            {s.links
              .filter((l) => !l.professorOnly || auth.isProfessor)
              .map((l) => (
                <NavLink key={l.to} to={l.to} end={l.to === '/admin'} className={({ isActive }) => (active(l.to, isActive) ? 'active' : '')}>
                  <span>{l.label}</span>
                  {l.badge && pending > 0 && <span className="badge">{pending}</span>}
                </NavLink>
              ))}
          </div>
        ))}
        <h5>Account</h5>
        <NavLink to="/portal">My page</NavLink>
        <a onClick={() => void auth.signOut()} style={{ cursor: 'pointer' }}>Sign out</a>
      </nav>
      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  );
}
