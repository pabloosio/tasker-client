import { useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { FiClock, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import activityService from '../../services/activityService';
import ActivityItem from './ActivityItem';
import './Activity.css';

/**
 * Sección "Historial" dentro de una tarea. Se carga solo al abrirla.
 */
const TaskActivity = ({ taskId }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && items === null) {
      setLoading(true);
      try {
        const response = await activityService.getTaskActivity(taskId);
        setItems(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError(err.response?.data?.message || 'No se pudo cargar el historial');
      } finally {
        setLoading(false);
      }
    }
  };

  if (!taskId) return null;

  return (
    <div className="task-activity">
      <button type="button" className="task-activity-toggle" onClick={toggle} aria-expanded={open}>
        {open ? <FiChevronDown /> : <FiChevronRight />}
        <FiClock />
        Historial
        {items && <span className="task-activity-count">{items.length}</span>}
      </button>

      {open && (
        <div className="task-activity-content">
          {loading && <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>}
          {error && <p className="text-danger small mb-0">{error}</p>}
          {items && items.length === 0 && <p className="text-muted small mb-0">Sin movimientos registrados.</p>}
          {items && items.length > 0 && (
            <ul className="activity-list">
              {items.map(entry => <ActivityItem key={entry.id} entry={entry} />)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskActivity;
