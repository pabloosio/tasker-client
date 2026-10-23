import { useState, useEffect, useCallback, forwardRef } from 'react';
import { Dropdown, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCheck } from 'react-icons/fi';
import notificationService from '../../services/notificationService';
import { humanizeDate } from '../../utils/dateUtils';
import { formatTaskKey } from '../../utils/taskKey';
import './NotificationBell.css';

// Cada cuánto se revisa si hay avisos nuevos (además de al volver a la pestaña)
const POLL_MS = 60 * 1000;

const ACTION_TEXT = {
  MENTION: 'te mencionó en',
  TASK_ASSIGNED: 'te asignó',
  COLLABORATOR_ADDED: 'te agregó a colaborar en',
  COMMENT: 'comentó en'
};

const BellToggle = forwardRef(({ onClick, unread }, ref) => (
  <button
    ref={ref}
    type="button"
    className="nb-toggle"
    onClick={(e) => { e.preventDefault(); onClick(e); }}
    aria-label={unread ? `Avisos: ${unread} sin leer` : 'Avisos'}
    title="Avisos"
  >
    <FiBell size={18} />
    {unread > 0 && <span className="nb-badge">{unread > 99 ? '99+' : unread}</span>}
  </button>
));
BellToggle.displayName = 'BellToggle';

/**
 * Campanita de avisos: menciones, asignaciones, colaboraciones y comentarios en tus tareas.
 */
const NotificationBell = () => {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refreshCount = useCallback(() => {
    notificationService.unreadCount().then(setUnread).catch(() => {});
  }, []);

  // Al entrar, cada minuto y al volver a la pestaña
  useEffect(() => {
    const first = setTimeout(refreshCount, 0);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refreshCount();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && refreshCount();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshCount]);

  const loadList = () => {
    setLoading(true);
    notificationService.list()
      .then((res) => {
        setItems(res.data.items || []);
        setUnread(res.data.unreadCount || 0);
        setLoaded(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleToggle = (next) => {
    setOpen(next);
    if (next) loadList();
  };

  const openNotification = (item) => {
    setOpen(false);
    if (!item.readAt) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n)));
      setUnread((u) => Math.max(u - 1, 0));
      notificationService.markRead(item.id).catch(() => {});
    }
    if (item.data?.taskNumber) navigate(`/t/${formatTaskKey(item.data.taskNumber).slice(1)}`);
  };

  const markAll = () => {
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
    setUnread(0);
    notificationService.markAllRead().catch(() => {});
  };

  return (
    <Dropdown show={open} onToggle={handleToggle} align="end" className="nb">
      <Dropdown.Toggle as={BellToggle} unread={unread} />
      <Dropdown.Menu className="nb-menu" renderOnMount>
        <div className="nb-head">
          <strong>Avisos</strong>
          {unread > 0 && (
            <button type="button" className="nb-mark-all" onClick={markAll}>
              <FiCheck size={13} /> Marcar todo como leído
            </button>
          )}
        </div>

        <div className="nb-list">
          {loading && !loaded ? (
            <div className="nb-empty"><Spinner animation="border" size="sm" /></div>
          ) : items.length === 0 ? (
            <div className="nb-empty">
              <FiBell size={22} />
              <span>No tienes avisos todavía</span>
              <small>Aquí verás cuando te mencionen, te asignen una tarea o comenten en las tuyas.</small>
            </div>
          ) : items.map((item) => {
            const actor = item.actor?.name || 'Alguien';
            return (
              <button
                key={item.id}
                type="button"
                className={`nb-item ${item.readAt ? '' : 'is-unread'}`}
                onClick={() => openNotification(item)}
              >
                <span className="nb-avatar">{actor.charAt(0).toUpperCase()}</span>
                <span className="nb-text">
                  <span className="nb-line">
                    <strong>{actor}</strong> {ACTION_TEXT[item.type] || 'actualizó'}{' '}
                    <span className="nb-key">{formatTaskKey(item.data?.taskNumber)}</span>
                  </span>
                  <span className="nb-title">{item.data?.taskTitle}</span>
                  {item.data?.excerpt && <span className="nb-excerpt">“{item.data.excerpt}”</span>}
                  <span className="nb-time">{humanizeDate(item.createdAt)}</span>
                </span>
                {!item.readAt && <span className="nb-dot" aria-label="Sin leer" />}
              </button>
            );
          })}
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default NotificationBell;
