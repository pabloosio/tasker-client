import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import HoyPage from './pages/hoy/HoyPage';
import CategoriesPage from './pages/categories/CategoriesPage';
import ExportPage from './pages/export/ExportPage';
import WorkspacesPage from './pages/workspaces/WorkspacesPage';
import WorkspaceDetailPage from './pages/workspaces/WorkspaceDetailPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';

// Styles
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/App.css';

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
              path="/hoy"
              element={
                <PrivateRoute>
                  <HoyPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <DashboardPage />
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
              path="/admin/users"
              element={
                <AdminRoute>
                  <AdminUsersPage />
                </AdminRoute>
              }
            />

            {/* Redireccionamiento por defecto */}
            <Route path="/" element={<Navigate to="/hoy" />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </WorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;