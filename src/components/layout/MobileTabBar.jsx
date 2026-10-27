import { Link, useLocation } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';
import { NAV_ITEMS, isNavItemActive, openGlobalSearch } from './navItems';

/**
 * Barra inferior de pestañas (celular/tablet). Reemplaza el menú ☰: las secciones quedan a un toque
 * y al alcance del pulgar. Buscar va en medio porque es la acción más usada después del tablero.
 */
const MobileTabBar = () => {
  const { pathname } = useLocation();
  const [first, second, ...rest] = NAV_ITEMS;

  const tab = (item) => {
    const Icon = item.icon;
    const active = isNavItemActive(item.to, pathname);
    return (
      <Link key={item.to} to={item.to} className={`tabbar-item ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
        <Icon className="tabbar-icon" />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <nav className="tabbar" aria-label="Navegación principal">
      {tab(first)}
      {tab(second)}
      <button type="button" className="tabbar-item" onClick={openGlobalSearch}>
        <FiSearch className="tabbar-icon" />
        <span>Buscar</span>
      </button>
      {rest.map(tab)}
    </nav>
  );
};

export default MobileTabBar;
