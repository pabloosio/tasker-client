import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Spinner, Alert, Badge, Form } from 'react-bootstrap';
import { FiAlertCircle, FiSun, FiCalendar, FiClock, FiCheckCircle, FiInbox, FiArrowRight, FiPaperclip, FiChevronRight, FiMessageSquare } from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';
import TaskForm from '../../components/tasks/TaskForm';
import TaskViewModal from '../../components/tasks/TaskViewModal';
import taskService from '../../services/taskService';
import categoryService from '../../services/categoryService';
import workspaceService from '../../services/workspaceService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatDate } from '../../utils/dateUtils';
import { formatTaskKey } from '../../utils/taskKey';

const STATUS_OPTIONS = [
  { value: 'BACKLOG',     label: 'Backlog' },
  { value: 'PENDING',     label: 'Por hacer' },
  { value: 'IN_PROGRESS', label: 'En progreso' },
  { value: 'IN_REVIEW',   label: 'En revisión' },
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

// TaskForm y TaskViewModal trabajan con estado y prioridad en minúsculas (igual que el tablero)
const normalizeTask = (task) => ({
  ...task,
  status: task.status?.toLowerCase() || 'pending',
  priority: task.priority?.toLowerCase() || 'medium'
});

const MyTasksPage = () => {
  const navigate = useNavigate();
  const { workspaces, switchWorkspace } = useWorkspace();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [boardFilter, setBoardFilter] = useState('');

  // Tarea abierta en el modal, con los datos de su tablero (categorías, miembros, mi rol)
  const [openTask, setOpenTask] = useState(null); // { task, workspace, categories, members }
  const [openingId, setOpeningId] = useState(null);

  const loadTasks = useCallback(() =>
    taskService.getMyTasks()
      .then((response) => setTasks(Array.isArray(response.data) ? response.data : []))
      .catch((err) => setError(err.response?.data?.message || 'Error al cargar tus tareas'))
      .finally(() => setLoading(false)),
  []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

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
    navigate('/tablero');
  };

  // Abrir la tarea completa: se traen la tarea, las categorías y los miembros de SU tablero
  const openTaskDetail = async (task) => {
    if (openingId) return;
    setOpeningId(task.id);
    try {
      const workspace = (workspaces || []).find(w => w.id === task.workspaceId) || null;
      const [taskRes, categoriesRes, membersRes] = await Promise.all([
        taskService.getTaskById(task.id),
        task.workspaceId ? categoryService.getCategories({ workspaceId: task.workspaceId }) : Promise.resolve({ data: [] }),
        task.workspaceId && workspace && !workspace.isPersonal ? workspaceService.getMembers(task.workspaceId) : Promise.resolve({ data: [] })
      ]);
      const categories = categoriesRes.data || categoriesRes;
      const members = membersRes.data || membersRes;
      setOpenTask({
        task: normalizeTask(taskRes.data || taskRes),
        workspace,
        categories: Array.isArray(categories) ? categories : [],
        members: Array.isArray(members) ? members : []
      });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo abrir la tarea');
    } finally {
      setOpeningId(null);
    }
  };

  const closeTaskDetail = () => setOpenTask(null);

  // Al guardar se recarga la lista: la tarea puede cambiar de grupo o dejar de estar asignada a mí
  const handleTaskUpdated = () => {
    setOpenTask(null);
    loadTasks();
  };

  const handleAttachmentsChange = (taskId, summary) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...summary } : t));
  };

  // Tableros presentes en mis tareas (para el filtro)
  const boards = [...new Map(tasks.filter(t => t.workspace).map(t => [t.workspace.id, t.workspace])).values()];
  const visibleTasks = boardFilter ? tasks.filter(t => t.workspaceId === boardFilter) : tasks;
  const groups = groupTasks(visibleTasks);
  const countOf = (key) => groups.find(([k]) => k === key)?.[1].tasks.length || 0;

  const openIsReadOnly = openTask?.workspace?.myRole === 'VIEWER';

  return (
    <MainLayout>
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
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
          <div className="my-tasks-summary mb-3">
            <span className={`my-tasks-summary-item ${countOf('overdue') > 0 ? 'is-danger' : ''}`}>
              <FiAlertCircle size={13} /><strong>{countOf('overdue')}</strong> vencidas
            </span>
            <span className="my-tasks-summary-item">
              <FiSun size={13} /><strong>{countOf('today')}</strong> para hoy
            </span>
            <span className="my-tasks-summary-item">
              <FiCalendar size={13} /><strong>{countOf('week')}</strong> esta semana
            </span>
          </div>

          {groups.map(([key, group]) => {
            const Icon = group.icon;
            return (
              <section
                key={key}
                className={`my-tasks-group mb-3 ${key === 'done' ? 'is-done' : ''}`}
                style={{ '--group-color': group.color }}
              >
                <div className="my-tasks-group-header">
                  <Icon size={15} style={{ color: group.color }} />
                  <span className="my-tasks-group-title">{group.title}</span>
                  <Badge bg="secondary" className="ms-auto">{group.tasks.length}</Badge>
                </div>
                {group.tasks.map(task => (
                  <div
                    key={task.id}
                    className={`my-task-row ${openingId === task.id ? 'is-opening' : ''}`}
                    style={{ '--priority-color': PRIORITY_COLOR[task.priority] || '#94a3b8' }}
                    role="button"
                    tabIndex={0}
                    onClick={() => openTaskDetail(task)}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        openTaskDetail(task);
                      }
                    }}
                    title="Ver y editar la tarea"
                  >
                    {/* El estado va primero: es lo que más se cambia desde aquí */}
                    <Form.Select
                      size="sm"
                      className="my-task-status"
                      data-status={task.status}
                      value={task.status}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      onChange={(e) => handleStatusChange(task, e.target.value)}
                      aria-label={`Estado de ${task.title}`}
                    >
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Form.Select>

                    <div className="my-task-main">
                      <div className="my-task-title">
                        <span className="task-key me-2">{formatTaskKey(task.number)}</span>
                        {task.title}
                      </div>
                      <div className="my-task-meta">
                        <button
                          type="button"
                          className="my-task-board"
                          onClick={(e) => {
                            e.stopPropagation();
                            openBoard(task.workspaceId);
                          }}
                          title="Abrir el tablero"
                        >
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
                        {task.attachmentCount > 0 && (
                          <span title={`${task.attachmentCount} archivo(s) adjunto(s)`}>
                            <FiPaperclip size={11} className="me-1" />
                            {task.attachmentCount}
                          </span>
                        )}
                        {Number(task.commentCount) > 0 && (
                          <span title={`${task.commentCount} comentario(s)`}>
                            <FiMessageSquare size={11} className="me-1" />
                            {task.commentCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {openingId === task.id
                      ? <Spinner animation="border" size="sm" className="my-task-open" />
                      : <FiChevronRight size={18} className="my-task-open" aria-hidden="true" />}
                  </div>
                ))}
              </section>
            );
          })}
        </>
      )}

      {/* Detalle de la tarea: editable, o solo lectura si soy observador en ese tablero */}
      {openTask && (openIsReadOnly ? (
        <TaskViewModal
          show
          onHide={closeTaskDetail}
          task={openTask.task}
          workspace={openTask.workspace}
          onAttachmentsChange={handleAttachmentsChange}
        />
      ) : (
        <TaskForm
          show
          onHide={closeTaskDetail}
          taskToEdit={openTask.task}
          onTaskUpdated={handleTaskUpdated}
          onTaskCreated={() => {}}
          onWarning={(msg) => setError(msg)}
          onAttachmentsChange={handleAttachmentsChange}
          categories={openTask.categories}
          workspaceId={openTask.task.workspaceId}
          workspaceMembers={openTask.members}
          workspace={openTask.workspace}
        />
      ))}
    </MainLayout>
  );
};

export default MyTasksPage;
