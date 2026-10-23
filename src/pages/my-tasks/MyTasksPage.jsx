import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Spinner, Alert, Badge, Form } from 'react-bootstrap';
import { FiAlertCircle, FiSun, FiCalendar, FiClock, FiCheckCircle, FiInbox, FiArrowRight } from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';
import taskService from '../../services/taskService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatDate } from '../../utils/dateUtils';
import { formatTaskKey } from '../../utils/taskKey';

const STATUS_OPTIONS = [
  { value: 'BACKLOG',     label: 'Backlog' },
  { value: 'PENDING',     label: 'Por hacer' },
  { value: 'IN_PROGRESS', label: 'En Progreso' },
  { value: 'IN_REVIEW',   label: 'En Revisión' },
  { value: 'COMPLETED',   label: 'Completada' }
];

const PRIORITY_COLOR = { HIGH: '#dc3545', MEDIUM: '#ffc107', LOW: '#198754' };

const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Agrupa por urgencia; las completadas (últimos 7 días) van al final
const groupTasks = (tasks) => {
  const today = toIso(new Date());
  const inAWeek = toIso(new Date(Date.now() + 7 * 86400000));
  const groups = {
    overdue:  { title: 'Vencidas',          icon: FiAlertCircle, color: '#dc3545', tasks: [] },
    today:    { title: 'Hoy',               icon: FiSun,         color: '#f59e0b', tasks: [] },
    week:     { title: 'Próximos 7 días',   icon: FiCalendar,    color: '#0d6efd', tasks: [] },
    later:    { title: 'Más adelante',      icon: FiClock,       color: '#6b7685', tasks: [] },
    noDate:   { title: 'Sin fecha',         icon: FiInbox,       color: '#94a3b8', tasks: [] },
    done:     { title: 'Completadas esta semana', icon: FiCheckCircle, color: '#198754', tasks: [] }
  };

  tasks.forEach((task) => {
    if (task.status === 'COMPLETED') groups.done.tasks.push(task);
    else if (!task.dueDate) groups.noDate.tasks.push(task);
    else if (task.dueDate < today) groups.overdue.tasks.push(task);
    else if (task.dueDate === today) groups.today.tasks.push(task);
    else if (task.dueDate <= inAWeek) groups.week.tasks.push(task);
    else groups.later.tasks.push(task);
  });

  return Object.entries(groups).filter(([, g]) => g.tasks.length > 0);
};

const MyTasksPage = () => {
  const navigate = useNavigate();
  const { workspaces, switchWorkspace } = useWorkspace();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [boardFilter, setBoardFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await taskService.getMyTasks();
        setTasks(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError(err.response?.data?.message || 'Error al cargar tus tareas');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleStatusChange = async (task, status) => {
    const previous = task.status;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status } : t));
    try {
      const response = await taskService.updateTaskStatus(task.id, status);
      const updated = response.data || {};
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...updated, workspace: t.workspace } : t));
    } catch (err) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: previous } : t));
      setError(err.response?.data?.message || 'No se pudo actualizar la tarea');
    }
  };

  const openBoard = (workspaceId) => {
    const workspace = (workspaces || []).find(w => w.id === workspaceId);
    if (workspace) switchWorkspace(workspace);
    navigate('/dashboard');
  };

  // Tableros presentes en mis tareas (para el filtro)
  const boards = [...new Map(tasks.filter(t => t.workspace).map(t => [t.workspace.id, t.workspace])).values()];
  const visibleTasks = boardFilter ? tasks.filter(t => t.workspaceId === boardFilter) : tasks;
  const groups = groupTasks(visibleTasks);
  const countOf = (key) => groups.find(([k]) => k === key)?.[1].tasks.length || 0;

  return (
    <MainLayout>
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
        <div>
          <h2 className="mb-1">Mis tareas</h2>
          <p className="text-muted mb-0">Todo lo que tienes asignado, en todos tus tableros.</p>
        </div>
        {boards.length > 1 && (
          <Form.Select
            size="sm"
            style={{ maxWidth: 260 }}
            value={boardFilter}
            onChange={(e) => setBoardFilter(e.target.value)}
            aria-label="Filtrar por tablero"
          >
            <option value="">Todos los tableros</option>
            {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Form.Select>
        )}
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Cargando tus tareas...</p>
        </div>
      ) : groups.length === 0 ? (
        <Card className="shadow-sm border-0">
          <Card.Body className="text-center py-5">
            <FiCheckCircle size={36} className="text-success mb-3" />
            <h5 className="mb-1">No tienes tareas asignadas</h5>
            <p className="text-muted mb-0">Cuando alguien te asigne una tarea aparecerá aquí.</p>
          </Card.Body>
        </Card>
      ) : (
        <>
          <div className="my-tasks-summary mb-4">
            <span className="my-tasks-summary-item text-danger"><strong>{countOf('overdue')}</strong> vencidas</span>
            <span className="my-tasks-summary-item"><strong>{countOf('today')}</strong> para hoy</span>
            <span className="my-tasks-summary-item"><strong>{countOf('week')}</strong> esta semana</span>
          </div>

          {groups.map(([key, group]) => {
            const Icon = group.icon;
            return (
              <section key={key} className={`my-tasks-group mb-4 ${key === 'done' ? 'is-done' : ''}`}>
                <h6 className="my-tasks-group-title" style={{ color: group.color }}>
                  <Icon size={15} />
                  {group.title}
                  <Badge bg="light" text="dark" className="ms-1">{group.tasks.length}</Badge>
                </h6>
                <Card className="shadow-sm">
                  {group.tasks.map(task => (
                    <div
                      key={task.id}
                      className="my-task-row"
                      style={{ '--priority-color': PRIORITY_COLOR[task.priority] || '#94a3b8' }}
                    >
                      <div className="my-task-main">
                        <div className="my-task-title">
                          <span className="task-key me-2">{formatTaskKey(task.number)}</span>
                          {task.title}
                        </div>
                        <div className="my-task-meta">
                          <button type="button" className="my-task-board" onClick={() => openBoard(task.workspaceId)} title="Abrir el tablero">
                            {task.workspace?.name}
                            <FiArrowRight size={11} />
                          </button>
                          {task.category && (
                            <span className="d-inline-flex align-items-center gap-1">
                              <span className="category-dot" style={{ backgroundColor: task.category.color, width: 6, height: 6 }} />
                              {task.category.name}
                            </span>
                          )}
                          {task.dueDate && (
                            <span className={key === 'overdue' ? 'text-danger fw-semibold' : ''}>
                              <FiCalendar size={11} className="me-1" />
                              {formatDate(task.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Form.Select
                        size="sm"
                        className="my-task-status"
                        value={task.status}
                        onChange={(e) => handleStatusChange(task, e.target.value)}
                        aria-label="Estado"
                      >
                        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </Form.Select>
                    </div>
                  ))}
                </Card>
              </section>
            );
          })}
        </>
      )}
    </MainLayout>
  );
};

export default MyTasksPage;
