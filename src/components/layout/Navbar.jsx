import { Navbar as BSNavbar, Nav, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiLogOut, FiUser, FiShield, FiActivity } from 'react-icons/fi';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';
import { NAV_ITEMS, isNavItemActive } from './navItems';
import logo from '../../assets/logo.png';
import './Navbar.css';

/**
 * Escritorio (≥992px): logo · tablero · secciones · Buscar · 🔔 · usuario.
 * Celular/tablet: logo · tablero · 🔔 · usuario arriba; las secciones van en la barra inferior (MobileTabBar).
 */
const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <BSNavbar expand="lg" className="custom-navbar">
      <BSNavbar.Brand as={Link} to="/" className="navbar-brand-custom" title="Palomea Tareas">
        <span className="brand-tile">
          <img src={logo} alt="Palomea Tareas" className="brand-logo" />
        </span>
      </BSNavbar.Brand>

      <div className="navbar-switcher-wrapper">
        <WorkspaceSwitcher />
      </div>

      {/* Solo escritorio: en celular estas secciones viven en la barra inferior */}
      <BSNavbar.Collapse id="basic-navbar-nav">
        <Nav className="mx-auto nav-center">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Nav.Link
                key={item.to}
                as={Link}
                to={item.to}
                className={`nav-link-custom ${isNavItemActive(item.to, location.pathname) ? 'active' : ''}`}
              >
                <Icon className="nav-icon" />
                <span> {item.label}</span>
              </Nav.Link>
            );
          })}
        </Nav>

        <Nav className="nav-end">
          <GlobalSearch />
        </Nav>
      </BSNavbar.Collapse>

      {/* Fuera del menú colapsable: visibles en todos los tamaños. Orden: 🔔 y al final el usuario */}
      <NotificationBell />

      <Nav className="nav-user">
        <NavDropdown
          title={
            <div className="user-dropdown-toggle" title={user?.name}>
              <div className="user-avatar">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <span className="user-name">{user?.name || 'Usuario'}</span>
            </div>
          }
          id="user-dropdown"
          align="end"
          className="user-dropdown"
        >
          {/* En celular el avatar no muestra el nombre: se identifica aquí */}
          <div className="user-dropdown-header">
            <strong>{user?.name}</strong>
            <small>{user?.email}</small>
          </div>
          <NavDropdown.Divider />
          <NavDropdown.Item as={Link} to="/profile" className="dropdown-item-custom">
            <FiUser className="me-2" />
            Mi Perfil
          </NavDropdown.Item>
          {user?.role === 'ADMIN' && (
            <>
              <NavDropdown.Divider />
              <NavDropdown.Item as={Link} to="/admin/users" className="dropdown-item-custom">
                <FiShield className="me-2" />
                Panel de Admin
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/admin/auditoria" className="dropdown-item-custom">
                <FiActivity className="me-2" />
                Auditoría
              </NavDropdown.Item>
            </>
          )}
          <NavDropdown.Divider />
          <NavDropdown.Item onClick={handleLogout} className="dropdown-item-custom dropdown-item-logout">
            <FiLogOut className="me-2" />
            Cerrar Sesión
          </NavDropdown.Item>
        </NavDropdown>
      </Nav>
    </BSNavbar>
  );
};

export default Navbar;
