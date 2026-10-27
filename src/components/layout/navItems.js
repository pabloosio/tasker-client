import { FiColumns, FiCheckSquare, FiBriefcase, FiBarChart2 } from 'react-icons/fi';

/**
 * Secciones principales: las usan el header (escritorio) y la barra inferior (celular).
 * Categorías, miembros y actividad viven en el selector de tablero ("Este tablero").
 */
export const NAV_ITEMS = [
  { to: '/tablero', label: 'Tablero', icon: FiColumns },
  { to: '/mis-tareas', label: 'Mis tareas', icon: FiCheckSquare },
  { to: '/workspaces', label: 'Tableros', icon: FiBriefcase },
  { to: '/export', label: 'Reportes', icon: FiBarChart2 }
];

// "Tableros" sigue activo en el detalle y la actividad de un tablero (/workspaces/:id/…)
export const isNavItemActive = (to, pathname) =>
  pathname === to || (to === '/workspaces' && pathname.startsWith('/workspaces/'));

// Abre el buscador global desde cualquier parte (lo escucha GlobalSearch)
export const OPEN_SEARCH_EVENT = 'tasker:open-search';
export const openGlobalSearch = () => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
