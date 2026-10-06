import { Component, lazy, Suspense, useEffect, type ComponentType, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { isConfigured } from './lib/amplify';
import { AuthProvider, useAuth } from './lib/auth';
import { setActor } from './lib/audit';
import { LangProvider } from './lib/i18n';
import { uploads } from './lib/uploads';
import Layout from './components/Layout';
import { Loading, ToastProvider } from './components/ui';
import Home from './pages/public/Home';
import Professor from './pages/public/Professor';
import Research from './pages/public/Research';
import Publications from './pages/public/Publications';
import Members from './pages/public/Members';
import MemberDetail from './pages/public/MemberDetail';
import Alumni from './pages/public/Alumni';
import { News, NewsDetail } from './pages/public/News';
import { AlbumPage, Gallery } from './pages/public/Gallery';
import Visitors from './pages/public/Visitors';
import Teaching from './pages/public/Teaching';
import Contact from './pages/public/Contact';
import Search from './pages/public/Search';

// Sign-in, the members area and the admin console load only when opened,
// so visitors to the public pages download much less.
const Login = lazy(() => import('./pages/portal/Login'));
const Portal = lazy(() => import('./pages/portal/Portal'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const named = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) => lazy(() => load().then((m) => ({ default: m[name] })));
const Dashboard = named(() => import('./pages/admin/dashboard'), 'Dashboard');
const SubmissionsAdmin = named(() => import('./pages/admin/dashboard'), 'SubmissionsAdmin');
const MembersAdmin = named(() => import('./pages/admin/members'), 'MembersAdmin');
const AccountsAdmin = named(() => import('./pages/admin/members'), 'AccountsAdmin');
const PostsAdmin = named(() => import('./pages/admin/sections'), 'PostsAdmin');
const PublicationsAdmin = named(() => import('./pages/admin/sections'), 'PublicationsAdmin');
const ProjectsAdmin = named(() => import('./pages/admin/sections'), 'ProjectsAdmin');
const AwardsAdmin = named(() => import('./pages/admin/sections'), 'AwardsAdmin');
const AlbumsAdmin = named(() => import('./pages/admin/sections'), 'AlbumsAdmin');
const GuestsAdmin = named(() => import('./pages/admin/sections'), 'GuestsAdmin');
const SiteContentAdmin = named(() => import('./pages/admin/siteContent'), 'SiteContentAdmin');
const UploadCenter = named(() => import('./pages/admin/uploads'), 'UploadCenter');
const ImportExport = named(() => import('./pages/admin/importExport'), 'ImportExport');
const ActivityLog = named(() => import('./pages/admin/importExport'), 'ActivityLog');

function RequireAuth({ staff, children }: { staff?: boolean; children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();
  if (!auth.ready) return <Loading />;
  if (!auth.signedIn) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (staff && !auth.isStaff)
    return (
      <section className="section container">
        <h1>Staff only</h1>
        <p>This area is for Prof. Sakurai and seminar administrators.</p>
      </section>
    );
  return <>{children}</>;
}

function SessionEffects() {
  const auth = useAuth();
  useEffect(() => {
    uploads.setIdentity(auth.identityId);
    setActor(auth.name || auth.email || '');
  }, [auth.identityId, auth.name, auth.email]);
  return null;
}

/** Shows a message instead of a blank page if something unexpected fails while rendering. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error)
      return (
        <section className="section container">
          <h1>Something went wrong</h1>
          <p>This page could not be displayed. Please reload, or go back to the <a href="/">home page</a>.</p>
          <p className="small muted">{this.state.error.message}</p>
        </section>
      );
    return this.props.children;
  }
}

function NotFound() {
  return (
    <section className="section container">
      <h1>Page not found</h1>
      <p>The page you are looking for has moved or does not exist.</p>
    </section>
  );
}

export default function App() {
  if (!isConfigured) {
    return (
      <div className="container section">
        <h1>Backend not connected</h1>
        <p>
          <code>amplify_outputs.json</code> is empty. Deploy through AWS Amplify (it is generated automatically), or run <code>npx ampx sandbox</code> locally. See README.md.
        </p>
      </div>
    );
  }
  return (
    <LangProvider>
      <AuthProvider>
        <ToastProvider>
          <SessionEffects />
          <BrowserRouter>
            <ErrorBoundary>
            <Suspense fallback={<Loading />}>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="professor" element={<Professor />} />
                <Route path="research" element={<Research />} />
                <Route path="publications" element={<Publications />} />
                <Route path="members" element={<Members />} />
                <Route path="members/:slug" element={<MemberDetail />} />
                <Route path="alumni" element={<Alumni />} />
                <Route path="news" element={<News />} />
                <Route path="news/:slug" element={<NewsDetail />} />
                <Route path="gallery" element={<Gallery />} />
                <Route path="gallery/:slug" element={<AlbumPage />} />
                <Route path="visitors" element={<Visitors />} />
                <Route path="teaching" element={<Teaching />} />
                <Route path="contact" element={<Contact />} />
                <Route path="search" element={<Search />} />
                <Route path="login" element={<Login />} />
                <Route path="portal" element={<RequireAuth><Portal /></RequireAuth>} />
                <Route path="admin" element={<RequireAuth staff><AdminLayout /></RequireAuth>}>
                  <Route index element={<Dashboard />} />
                  <Route path="submissions" element={<SubmissionsAdmin />} />
                  <Route path="members" element={<MembersAdmin />} />
                  <Route path="accounts" element={<AccountsAdmin />} />
                  <Route path="visitors" element={<GuestsAdmin />} />
                  <Route path="content" element={<SiteContentAdmin />} />
                  <Route path="posts" element={<PostsAdmin />} />
                  <Route path="gallery" element={<AlbumsAdmin />} />
                  <Route path="publications" element={<PublicationsAdmin />} />
                  <Route path="projects" element={<ProjectsAdmin />} />
                  <Route path="awards" element={<AwardsAdmin />} />
                  <Route path="uploads" element={<UploadCenter />} />
                  <Route path="import" element={<ImportExport />} />
                  <Route path="activity" element={<ActivityLog />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
            </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </LangProvider>
  );
}
