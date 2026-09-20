import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AdminLayout, ClientLayout, PublicLayout } from '../layouts';
import ProtectedRoute from './ProtectedRoute';
import RoleGuard from './RoleGuard';
import RootRedirect from './RootRedirect';
import RouteLoadingFallback from './RouteLoadingFallback';
import { ROUTES } from './routes';

const LoginPage = lazy(() => import('../../pages/public/LoginPage'));
const NotFoundPage = lazy(() => import('../../pages/public/NotFoundPage'));
const AdminHomePage = lazy(() => import('../../pages/admin/AdminHomePage'));
const AdminClientsPage = lazy(() => import('../../pages/admin/AdminClientsPage'));
const AdminClientDetailPage = lazy(() => import('../../pages/admin/AdminClientDetailPage'));
const AdminPostsPage = lazy(() => import('../../pages/admin/AdminPostsPage'));
const AdminCalendarPage = lazy(() => import('../../pages/admin/AdminCalendarPage'));
const AdminFinancePage = lazy(() => import('../../pages/admin/AdminFinancePage'));
const AdminInsightsPage = lazy(() => import('../../pages/admin/AdminInsightsPage'));
const AdminTrashPage = lazy(() => import('../../pages/admin/AdminTrashPage'));
const AdminSettingsPage = lazy(() => import('../../pages/admin/AdminSettingsPage'));
const AdminMediaUploadPage = lazy(() => import('../../pages/admin/AdminMediaUploadPage'));
const AdminMediaLibraryPage = lazy(() => import('../../pages/admin/AdminMediaLibraryPage'));
const AdminNotificationsPage = lazy(() => import('../../pages/admin/AdminNotificationsPage'));
const AdminAccessPage = lazy(() => import('../../pages/admin/AdminAccessPage'));
const AdminTeamPage = lazy(() => import('../../pages/admin/AdminTeamPage'));
const ClientHomePage = lazy(() => import('../../pages/client/ClientHomePage'));
const ClientPostsPage = lazy(() => import('../../pages/client/ClientPostsPage'));
const ClientCalendarPage = lazy(() => import('../../pages/client/ClientCalendarPage'));
const ClientFinancePage = lazy(() => import('../../pages/client/ClientFinancePage'));
const ClientPaymentPage = lazy(() => import('../../pages/client/ClientPaymentPage'));
const ClientInsightsPage = lazy(() => import('../../pages/client/ClientInsightsPage'));
const ClientProfilePage = lazy(() => import('../../pages/client/ClientProfilePage'));
const ClientShowcasePage = lazy(() => import('../../pages/client/ClientShowcasePage'));
const ClientNotificationsPage = lazy(() => import('../../pages/client/ClientNotificationsPage'));
const ClientMediaLibraryPage = lazy(() => import('../../pages/client/ClientMediaLibraryPage'));

const routeElement = (Page: LazyExoticComponent<ComponentType>) => (
  <Suspense fallback={<RouteLoadingFallback />}><Page /></Suspense>
);

export default function AppRouter() {
  return <BrowserRouter><Routes>
    <Route element={<PublicLayout />}>
      <Route path={ROUTES.login} element={routeElement(LoginPage)} />
      <Route path={ROUTES.notFound} element={routeElement(NotFoundPage)} />
    </Route>
    <Route path={ROUTES.root} element={<RootRedirect />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<RoleGuard roles={['admin', 'manager', 'social_media']} />}>
        <Route path={ROUTES.admin.root} element={<AdminLayout />}>
          <Route index element={routeElement(AdminHomePage)} />
          <Route path={ROUTES.admin.notifications} element={routeElement(AdminNotificationsPage)} />
          <Route path={ROUTES.admin.clients} element={routeElement(AdminClientsPage)} />
          <Route path={ROUTES.admin.clientDetail} element={routeElement(AdminClientDetailPage)} />
          <Route path={ROUTES.admin.posts} element={routeElement(AdminPostsPage)} />
          <Route path={ROUTES.admin.calendar} element={routeElement(AdminCalendarPage)} />
          <Route path={ROUTES.admin.metrics} element={routeElement(AdminInsightsPage)} />
          <Route path={ROUTES.admin.media} element={routeElement(AdminMediaLibraryPage)} />
          <Route path={ROUTES.admin.mediaUpload} element={routeElement(AdminMediaUploadPage)} />
          <Route element={<RoleGuard role="admin" />}>
            <Route path={ROUTES.admin.finance} element={routeElement(AdminFinancePage)} />
            <Route path={ROUTES.admin.trash} element={routeElement(AdminTrashPage)} />
            <Route path={ROUTES.admin.settings} element={routeElement(AdminSettingsPage)} />
            <Route path={ROUTES.admin.access} element={routeElement(AdminAccessPage)} />
            <Route path={ROUTES.admin.team} element={routeElement(AdminTeamPage)} />
          </Route>
        </Route>
      </Route>
      <Route element={<RoleGuard role="client" />}>
        <Route path={ROUTES.client.root} element={<ClientLayout />}>
          <Route index element={routeElement(ClientHomePage)} />
          <Route path={ROUTES.client.notifications} element={routeElement(ClientNotificationsPage)} />
          <Route path={ROUTES.client.posts} element={routeElement(ClientPostsPage)} />
          <Route path={ROUTES.client.calendar} element={routeElement(ClientCalendarPage)} />
          <Route path={ROUTES.client.media} element={routeElement(ClientMediaLibraryPage)} />
          <Route path={ROUTES.client.finance} element={routeElement(ClientFinancePage)} />
          <Route path={ROUTES.client.payment} element={routeElement(ClientPaymentPage)} />
          <Route path={ROUTES.client.metrics} element={routeElement(ClientInsightsPage)} />
          <Route path={ROUTES.client.profile} element={routeElement(ClientProfilePage)} />
          <Route path={ROUTES.client.showcase} element={routeElement(ClientShowcasePage)} />
        </Route>
      </Route>
    </Route>
    <Route path="*" element={routeElement(NotFoundPage)} />
  </Routes></BrowserRouter>;
}
