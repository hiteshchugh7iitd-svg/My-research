import { NavLink, Outlet } from 'react-router-dom';
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
      { to: '/admin/content', label: 'Cover page & site text' },
      { to: '/admin/posts', label: 'News & events' },
      { to: '/admin/gallery', label: 'Gallery' },
      { to: '/admin/publications', label: 'Publications' },
      { to: '/admin/projects', label: 'Research projects' },
      { to: '/admin/awards', label: 'Awards' },
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
  return (
    <div className="admin">
      <nav className="admin-nav" aria-label="Admin">
        {SECTIONS.map((s) => (
          <div key={s.title} style={{ display: 'contents' }}>
            <h5>{s.title}</h5>
            {s.links
              .filter((l) => !l.professorOnly || auth.isProfessor)
              .map((l) => (
                <NavLink key={l.to} to={l.to} end={l.to === '/admin'} className={({ isActive }) => (isActive ? 'active' : '')}>
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
