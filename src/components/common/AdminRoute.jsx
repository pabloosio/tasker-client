import { Navigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';

/**
 * Componente de ruta protegida para rutas administrativas
 * Solo permite acceso a usuarios con rol ADMIN
 */
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Cargando...</span>
        </Spinner>
      </div>
    );
  }

  // Si no hay usuario, redirigir a login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si el usuario no es admin, redirigir a dashboard
  if (user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  // Usuario es admin, mostrar contenido
  return children;
};

export default AdminRoute;
