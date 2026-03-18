import { NavDropdown, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FiUser, FiUsers, FiBriefcase, FiChevronDown, FiCheck, FiStar } from 'react-icons/fi';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';

const WorkspaceSwitcher = () => {
  const { workspaces, currentWorkspace, switchWorkspace, pinWorkspace } = useWorkspace();
  const { user } = useAuth();

  if (!currentWorkspace) return null;

  return (
    <NavDropdown
      title={
        <div className="ws-switcher-toggle">
          <div className="ws-switcher-icon">
            {currentWorkspace.isPersonal ? <FiUser size={13} /> : <FiUsers size={13} />}
          </div>
          <span className="ws-switcher-name">{currentWorkspace.name}</span>
          <FiChevronDown size={13} className="ws-switcher-chevron" />
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
      <NavDropdown.Divider />
      <NavDropdown.Item as={Link} to="/workspaces" className="ws-switcher-manage">
        <FiBriefcase size={14} className="me-2" />
        Gestionar Tableros
      </NavDropdown.Item>
    </NavDropdown>
  );
};

export default WorkspaceSwitcher;
