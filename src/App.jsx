import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import PrivateRoute from './components/common/PrivateRoute';
import AdminRoute from './components/common/AdminRoute';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import MyTasksPage from './pages/my-tasks/MyTasksPage';
import ProfilePage from './pages/profile/ProfilePage';
import TaskLinkPage from './pages/tasks/TaskLinkPage';
import ActivityPage from './pages/activity/ActivityPage';
import CategoriesPage from './pages/categories/CategoriesPage';
import ExportPage from './pages/export/ExportPage';
import WorkspacesPage from './pages/workspaces/WorkspacesPage';
import WorkspaceDetailPage from './pages/workspaces/WorkspaceDetailPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';

// Styles
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/App.css';

// Rutas anteriores del tablero (/dashboard, /tareas): se conservan para links viejos (correos, favoritos, ?task=)
const RedirectToBoard = () => {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: '/tablero', search, hash }} replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WorkspaceProvider>
          <Routes>
            {/* Rutas públicas */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            {/* Rutas protegidas */}
            <Route
              path="/tablero"
              element={
                <PrivateRoute>
                  <DashboardPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/t/:number"
              element={
                <PrivateRoute>
                  <TaskLinkPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <ProfilePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/mis-tareas"
              element={
                <PrivateRoute>
                  <MyTasksPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/categories"
              element={
                <PrivateRoute>
                  <CategoriesPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/export"
              element={
                <PrivateRoute>
                  <ExportPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/workspaces"
              element={
                <PrivateRoute>
                  <WorkspacesPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/workspaces/:id"
              element={
                <PrivateRoute>
                  <WorkspaceDetailPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/workspaces/:id/actividad"
              element={
                <PrivateRoute>
                  <ActivityPage scope="workspace" />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/auditoria"
              element={
                <AdminRoute>
                  <ActivityPage scope="global" />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <AdminUsersPage />
                </AdminRoute>
              }
            />

            {/* Redireccionamiento por defecto */}
            <Route path="/dashboard" element={<RedirectToBoard />} />
            <Route path="/tareas" element={<RedirectToBoard />} />
            <Route path="/" element={<Navigate to="/tablero" replace />} />
            <Route path="*" element={<Navigate to="/tablero" replace />} />
          </Routes>
        </WorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
