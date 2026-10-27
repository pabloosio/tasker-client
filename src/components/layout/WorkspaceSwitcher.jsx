import { NavDropdown, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FiUser, FiUsers, FiBriefcase, FiChevronDown, FiCheck, FiStar, FiFolder, FiSettings, FiActivity } from 'react-icons/fi';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS = { OWNER: 'Propietario', ADMIN: 'Administrador', MEMBER: 'Miembro', VIEWER: 'Observador' };

/**
 * Si el nombre empieza con un emoji ("📱 App Mi Axios") se separa: el emoji va en el ícono
 * y el texto queda limpio. Si no hay emoji, se usa el ícono de persona/equipo.
 */
const splitEmoji = (name = '') => {
  const first = typeof Intl !== 'undefined' && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(name)[Symbol.iterator]().next().value?.segment
    : null;
  if (first && /\p{Extended_Pictographic}/u.test(first)) {
    return { emoji: first, label: name.slice(first.length).trim() || name };
  }
  return { emoji: null, label: name };
};

const WorkspaceSwitcher = () => {
  const { workspaces, currentWorkspace, switchWorkspace, pinWorkspace } = useWorkspace();
  const { user } = useAuth();

  if (!currentWorkspace) return null;

  const current = splitEmoji(currentWorkspace.name);
  const isManager = ['OWNER', 'ADMIN'].includes(currentWorkspace.myRole);
  const role = ROLE_LABELS[currentWorkspace.myRole];
  const caption = currentWorkspace.isPersonal
    ? 'Tablero personal'
    : `Equipo${role ? ` · ${role}` : ''}`;

  return (
    <NavDropdown
      title={
        <div className="ws-switcher-toggle" title={currentWorkspace.name}>
          <div className="ws-switcher-icon">
            {current.emoji
              ? <span className="ws-switcher-emoji">{current.emoji}</span>
              : currentWorkspace.isPersonal ? <FiUser size={16} /> : <FiUsers size={16} />}
          </div>
          <div className="ws-switcher-text">
            <span className="ws-switcher-caption">{caption}</span>
            <span className="ws-switcher-name">{current.label}</span>
          </div>
          <span className="ws-switcher-chevron">
            <FiChevronDown size={14} />
          </span>
        </div>
      }
      id="workspace-dropdown"
      className="ws-switcher-dropdown"
    >
      <div className="ws-switcher-header">Cambiar tablero</div>
      {workspaces.map(ws => {
        const isPinned = user?.pinnedWorkspaceId === ws.id;
        return (
          <NavDropdown.Item
            key={ws.id}
            onClick={() => switchWorkspace(ws)}
            className={`ws-switcher-item ${currentWorkspace?.id === ws.id ? 'ws-active' : ''}`}
          >
            <div className="ws-item-icon">
              {ws.isPersonal ? <FiUser size={14} /> : <FiUsers size={14} />}
            </div>
            <div className="ws-item-info">
              <span className="ws-item-name">{ws.name}</span>
              {ws.isPersonal && <Badge bg="light" text="muted" className="ws-item-badge">Personal</Badge>}
            </div>
            <button
              className={`ws-pin-btn${isPinned ? ' pinned' : ''}`}
              title={isPinned ? 'Quitar predeterminado' : 'Fijar como predeterminado'}
              onClick={(e) => {
                e.stopPropagation();
                pinWorkspace(ws.id);
              }}
            >
              <FiStar
                size={14}
                style={{
                  fill: isPinned ? 'currentColor' : 'none',
                  color: isPinned ? '#f59e0b' : 'var(--gray-400, #9ca3af)'
                }}
              />
            </button>
            {currentWorkspace?.id === ws.id && <FiCheck size={15} className="ws-item-check" />}
          </NavDropdown.Item>
        );
      })}
      {/* Configuración del tablero actual (antes "Categorías" estaba en el menú principal) */}
      <NavDropdown.Divider />
      <div className="ws-switcher-header">Este tablero</div>
      <NavDropdown.Item as={Link} to="/categories" className="ws-switcher-manage ws-switcher-action">
        <FiFolder size={14} className="me-2" />
        Categorías
      </NavDropdown.Item>
      {!currentWorkspace.isPersonal && (
        <NavDropdown.Item as={Link} to={`/workspaces/${currentWorkspace.id}`} className="ws-switcher-manage ws-switcher-action">
          <FiSettings size={14} className="me-2" />
          Miembros y ajustes
        </NavDropdown.Item>
      )}
      {!currentWorkspace.isPersonal && isManager && (
        <NavDropdown.Item as={Link} to={`/workspaces/${currentWorkspace.id}/actividad`} className="ws-switcher-manage ws-switcher-action">
          <FiActivity size={14} className="me-2" />
          Actividad
        </NavDropdown.Item>
      )}
      <NavDropdown.Divider />
      <NavDropdown.Item as={Link} to="/workspaces" className="ws-switcher-manage">
        <FiBriefcase size={14} className="me-2" />
        Gestionar tableros
      </NavDropdown.Item>
    </NavDropdown>
  );
};

export default WorkspaceSwitcher;
