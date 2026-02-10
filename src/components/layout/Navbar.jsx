import { Navbar as BSNavbar, Nav, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiLogOut, FiUser, FiHome, FiFolder, FiDownload, FiBriefcase } from 'react-icons/fi';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import logo from '../../assets/logo.png';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <BSNavbar expand="lg" className="custom-navbar">
      <BSNavbar.Brand as={Link} to="/" className="navbar-brand-custom">
        <img src={logo} alt="Palomea Tareas" className="brand-logo" />
        <span className="brand-text d-none d-xl-inline">Palomea Tareas</span>
      </BSNavbar.Brand>

      <div className="d-none d-lg-flex ms-3">
        <WorkspaceSwitcher />
      </div>

      <BSNavbar.Toggle aria-controls="basic-navbar-nav" className="navbar-toggler-custom" />

      <BSNavbar.Collapse id="basic-navbar-nav">
        <div className="d-lg-none mt-3 mb-2">
          <WorkspaceSwitcher />
        </div>

        <Nav className="mx-auto nav-center">
          <Nav.Link
            as={Link}
            to="/dashboard"
            className={`nav-link-custom ${isActive('/tasks') || isActive('/dashboard') ? 'active' : ''}`}
          >
            <FiHome className="nav-icon" />
            <span> Tareas</span>
          </Nav.Link>
          <Nav.Link
            as={Link}
            to="/categories"
            className={`nav-link-custom ${isActive('/categories') ? 'active' : ''}`}
          >
            <FiFolder className="nav-icon" />
            <span> Categorías</span>
          </Nav.Link>
          <Nav.Link
            as={Link}
            to="/workspaces"
            className={`nav-link-custom ${isActive('/workspaces') ? 'active' : ''}`}
          >
            <FiBriefcase className="nav-icon" />
            <span> Tableros</span>
          </Nav.Link>
          <Nav.Link
            as={Link}
            to="/export"
            className={`nav-link-custom ${isActive('/export') ? 'active' : ''}`}
          >
            <FiDownload className="nav-icon" />
            <span> Exportar</span>
          </Nav.Link>
        </Nav>

        <Nav className="nav-end">
          <NavDropdown
            title={
              <div className="user-dropdown-toggle">
                <div className="user-avatar">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="user-name d-none d-md-inline">{user?.name || 'Usuario'}</span>
              </div>
            }
            id="user-dropdown"
            align="end"
            className="user-dropdown"
          >
            <NavDropdown.Item as={Link} to="/profile" className="dropdown-item-custom">
              <FiUser className="me-2" />
              Mi Perfil
            </NavDropdown.Item>
            <NavDropdown.Divider />
            <NavDropdown.Item onClick={handleLogout} className="dropdown-item-custom dropdown-item-logout">
              <FiLogOut className="me-2" />
              Cerrar Sesión
            </NavDropdown.Item>
          </NavDropdown>
        </Nav>
      </BSNavbar.Collapse>
    </BSNavbar>
  );
};

export default Navbar;
