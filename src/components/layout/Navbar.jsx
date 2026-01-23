import { Navbar as BSNavbar, Container, Nav, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiLogOut, FiUser } from 'react-icons/fi';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <BSNavbar bg="primary" variant="dark" expand="lg" className="mb-4">
      <Container>
        <BSNavbar.Brand as={Link} to="/">
          📝 Tasker
        </BSNavbar.Brand>
        <BSNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BSNavbar. Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav. Link as={Link} to="/dashboard">
              Dashboard
            </Nav.Link>
            <Nav.Link as={Link} to="/tasks">
              Tareas
            </Nav.Link>
            <Nav.Link as={Link} to="/categories">
              Categorías
            </Nav.Link>
          </Nav>
          <Nav>
            <NavDropdown title={user?. name || 'Usuario'} id="user-dropdown" align="end">
              <NavDropdown.Item as={Link} to="/profile">
                <FiUser className="me-2" />
                Mi Perfil
              </NavDropdown.Item>
              <NavDropdown. Divider />
              <NavDropdown.Item onClick={handleLogout}>
                <FiLogOut className="me-2" />
                Cerrar Sesión
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
};

export default Navbar;