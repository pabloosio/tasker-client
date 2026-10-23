import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Row, Col, Card, Spinner, Alert, Badge, ProgressBar, Form, Offcanvas, OverlayTrigger, Popover } from 'react-bootstrap';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FiCheckCircle, FiClock, FiLoader, FiPlus, FiEdit2, FiTrash2, FiCalendar, FiList, FiRefreshCw, FiX, FiFilter, FiCheckSquare, FiBarChart2, FiInbox, FiEye, FiLock, FiUser, FiUserX, FiAlertCircle, FiArrowUp, FiAlertTriangle, FiArchive } from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';
import TaskForm from '../../components/tasks/TaskForm';
import TaskViewModal from '../../components/tasks/TaskViewModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import WeeklyReportModal from '../../components/tasks/WeeklyReportModal';
import taskService from '../../services/taskService';
import categoryService from '../../services/categoryService';
import workspaceService from '../../services/workspaceService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { humanizeDate, formatDate } from '../../utils/dateUtils';
import { formatTaskKey } from '../../utils/taskKey';

// Flujo de 5 estados: Backlog → Por hacer → En Progreso → En Revisión → Completada
const STATUS_COLUMNS = [
  { status: 'backlog',     title: 'Backlog',     icon: FiInbox,       color: '#94a3b8' },
  { status: 'pending',     title: 'Por hacer',   icon: FiClock,       color: '#ffc107' },
  { status: 'in_progress', title: 'En Progreso', icon: FiLoader,      color: '#0dcaf0' },
  { status: 'in_review',   title: 'En Revisión', icon: FiEye,         color: '#8b5cf6' },
  { status: 'completed',   title: 'Completada',  icon: FiCheckCircle, color: '#198754' }
];

// Columnas a las que se les puede poner límite WIP
const WIP_COLUMNS = ['pending', 'in_progress', 'in_review'];
// Una tarjeta activa sin moverse por N días se marca como estancada
const STALE_DAYS = 5;

const QUICK_FILTERS = [
  { key: 'mine',       label: 'Mis tareas',     icon: FiUser },
  { key: 'overdue',    label: 'Vencidas',       icon: FiAlertCircle },
  { key: 'high',       label: 'Alta prioridad', icon: FiArrowUp },
  { key: 'unassigned', label: 'Sin asignar',    icon: FiUserX }
];
const QUICK_FILTERS_KEY = 'boardQuickFilters';

const loadQuickFilters = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(QUICK_FILTERS_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const daysSince = (date) => Math.floor((Date.now() - new Date(date).getTime()) / 86400000);

const isOverdue = (task) => !!task.dueDate && task.status !== 'completed' && task.dueDate < todayIso();
const staleDays = (task) => {
  if (!['pending', 'in_progress', 'in_review'].includes(task.status)) return 0;
  const days = daysSince(task.statusUpdatedAt || task.createdAt);
  return days >= STALE_DAYS ? days : 0;
};

const byPosition = (a, b) => (a.position ?? 0) - (b.position ?? 0);
const byCompletedDesc = (a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0);

const DashboardPage = () => {
  const { currentWorkspace, isViewer } = useWorkspace();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    q: '',
    priority: '',
    categoryId: '',
    assignee: '' // '' | 'UNASSIGNED' | userId
  });
  const [showFilters, setShowFilters] = useState(false);

  // Filtros rápidos (chips sobre el tablero), recordados por navegador
  const [quickFilters, setQuickFilters] = useState(loadQuickFilters);
  const toggleQuickFilter = (key) => {
    setQuickFilters(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      try { localStorage.setItem(QUICK_FILTERS_KEY, JSON.stringify(next)); } catch { /* sin storage */ }
      return next;
    });
  };

  // Datos del tablero: completadas archivadas y límites WIP por columna
  const [archivedCount, setArchivedCount] = useState(0);
  const [archiveDays, setArchiveDays] = useState(30);
  const [wipLimits, setWipLimits] = useState({});
  // Tablero cuyas tareas están cargadas (evita abrir una tarea con datos del tablero anterior)
  const [loadedWorkspaceId, setLoadedWorkspaceId] = useState(null);

  // ?task=ID (desde el buscador): abrir esa tarea cuando el tablero termine de cargar
  const [searchParams, setSearchParams] = useSearchParams();
  const taskParam = searchParams.get('task');

  // Task modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deletingTask, setDeletingTask] = useState(false);

  // Completadas visibles
  const [completedLimit, setCompletedLimit] = useState(10);

  // Weekly report modal
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [weeklyReportOffset, setWeeklyReportOffset] = useState(-1);

  // Kanban mobile slider
  const [activeColumn, setActiveColumn] = useState(0);
  const kanbanScrollRef = useRef(null);

  // Alto disponible: las columnas llegan hasta el borde inferior de la ventana (ver .kanban-board en App.css)
  const kanbanBoardRef = useRef(null);
  const hasTasks = Array.isArray(tasks) && tasks.length > 0;
  useLayoutEffect(() => {
    const el = kanbanBoardRef.current;
    if (!el) return;
    const updateTop = () => {
      el.style.setProperty('--kanban-top', `${el.getBoundingClientRect().top + window.scrollY}px`);
    };
    updateTop();
    window.addEventListener('resize', updateTop);
    return () => window.removeEventListener('resize', updateTop);
  }, [loading, hasTasks, error, isViewer]);

  const handleKanbanScroll = useCallback(() => {
    const el = kanbanScrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const columnWidth = el.firstElementChild?.offsetWidth || 1;
    const index = Math.round(scrollLeft / columnWidth);
    setActiveColumn(Math.min(index, STATUS_COLUMNS.length - 1));
  }, []);

  const scrollToColumn = useCallback((index) => {
    const el = kanbanScrollRef.current;
    if (!el || !el.children[index]) return;
    el.children[index].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, []);

  useEffect(() => {
    if (currentWorkspace) {
      fetchData({ showLoading: true });
    }
  }, [currentWorkspace?.id]);

  // Mostrar reporte semanal automáticamente los lunes (una vez por día)
  useEffect(() => {
    const today = new Date();
    const isMonday = today.getDay() === 1;
    const todayStr = today.toISOString().split('T')[0];
    const lastShown = localStorage.getItem('weeklyReportLastShown');
    if (isMonday && lastShown !== todayStr) {
      setWeeklyReportOffset(-1);
      setShowWeeklyReport(true);
      localStorage.setItem('weeklyReportLastShown', todayStr);
    }
  }, []);

  useEffect(() => {
    if (!taskParam || loading || loadedWorkspaceId !== currentWorkspace?.id) return;
    const clearParam = () => setSearchParams({}, { replace: true });

    const onBoard = tasks.find(t => t.id === taskParam);
    if (onBoard) {
      handleEditTask(onBoard);
      clearParam();
      return;
    }
    // Puede estar archivada (completada hace más de 30 días): pedirla directo
    taskService.getTaskById(taskParam)
      .then(response => handleEditTask(normalizeTask(response.data || response)))
      .catch(() => setError('No se pudo abrir la tarea'))
      .finally(clearParam);
  }, [taskParam, loading, loadedWorkspaceId, currentWorkspace?.id]);

  // Normalizar status y priority a minúsculas
  const normalizeTask = (task) => ({
    ...task,
    status: task.status?.toLowerCase() || 'pending',
    priority: task.priority?.toLowerCase() || 'medium'
  });

  const fetchData = async ({ showLoading } = { showLoading: true }) => {
    if (!currentWorkspace) return;
    if (showLoading) setLoading(true);
    const wsParams = { workspaceId: currentWorkspace.id };

    try {
      const promises = [
        taskService.getStats(wsParams),
        categoryService.getCategories(wsParams),
        taskService.getBoard(currentWorkspace.id)
      ];

      // Si no es personal, traer miembros del workspace
      if (!currentWorkspace.isPersonal) {
        promises.push(workspaceService.getMembers(currentWorkspace.id));
      }

      const [statsResponse, categoriesResponse, tasksResponse, membersResponse] = await Promise.all(promises);

      setStats(statsResponse.data || statsResponse);

      const categoriesData = categoriesResponse.data || categoriesResponse;
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);

      if (membersResponse) {
        const membersData = membersResponse.data || membersResponse;
        setMembers(Array.isArray(membersData) ? membersData : []);
      } else {
        setMembers([]);
      }

      const board = tasksResponse.data || {};
      setTasks((Array.isArray(board.tasks) ? board.tasks : []).map(normalizeTask));
      setLoadedWorkspaceId(currentWorkspace.id);
      setArchivedCount(board.archivedCount || 0);
      setArchiveDays(board.archiveDays || 30);
      // La API guarda los límites con el status en mayúsculas
      setWipLimits(Object.fromEntries(
        Object.entries(board.wipLimits || {}).map(([status, limit]) => [status.toLowerCase(), limit])
      ));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar datos');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!currentWorkspace) return;
    setError('');
    setRefreshing(true);
    try {
      await fetchData({ showLoading: false });
    } finally {
      setRefreshing(false);
    }
  };

  // Task handlers
  const handleTaskCreated = (newTask) => {
    const taskData = normalizeTask(newTask.data || newTask);
    setTasks(prev => [taskData, ...(Array.isArray(prev) ? prev : [])]);
    setShowTaskModal(false);
    setStats(prev => ({
      ...prev,
      total: (prev?.total || 0) + 1,
      byStatus: {
        ...prev?.byStatus,
        [taskData.status]: (prev?.byStatus?.[taskData.status] || 0) + 1
      },
      byPriority: {
        ...prev?.byPriority,
        [taskData.priority]: (prev?.byPriority?.[taskData.priority] || 0) + 1
      }
    }));
  };

  const handleTaskUpdated = (updatedTask) => {
    const taskData = normalizeTask(updatedTask.data || updatedTask);
    setTasks(prev => (Array.isArray(prev) ? prev : []).map(task =>
      task.id === taskData.id ? taskData : task
    ));
    setTaskToEdit(null);
    setShowTaskModal(false);
  };

  const handleEditTask = (task) => {
    setTaskToEdit(task);
    setShowTaskModal(true);
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;

    setDeletingTask(true);
    try {
      await taskService.deleteTask(taskToDelete.id);
      setTasks(prev => (Array.isArray(prev) ? prev : []).filter(task => task.id !== taskToDelete.id));
      setStats(prev => ({
        ...prev,
        total: Math.max((prev?.total || 1) - 1, 0),
        byStatus: {
          ...prev?.byStatus,
          [taskToDelete.status]: Math.max((prev?.byStatus?.[taskToDelete.status] || 1) - 1, 0)
        },
        byPriority: {
          ...prev?.byPriority,
          [taskToDelete.priority]: Math.max((prev?.byPriority?.[taskToDelete.priority] || 1) - 1, 0)
        }
      }));
      setTaskToDelete(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar la tarea');
    } finally {
      setDeletingTask(false);
    }
  };

  const handleCloseTaskModal = () => {
    setShowTaskModal(false);
    setTaskToEdit(null);
  };

  // Permisos por tarea (mismo criterio que la API): quien la creó, la persona asignada
  // y OWNER/ADMIN del tablero pueden moverla; borrar excluye a la persona asignada.
  const isManager = currentWorkspace?.isPersonal || ['OWNER', 'ADMIN'].includes(currentWorkspace?.myRole);
  const canDeleteTask = (task) => !isViewer && (isManager || task.userId === user?.id);
  const canEditTask = (task) =>
    canDeleteTask(task) || (!isViewer && (task.assignedTo || task.assignee?.id) === user?.id);

  // Posición para soltar una tarjeta en `index` de una columna (punto medio entre vecinas)
  const positionAt = (columnTasks, index) => {
    const before = columnTasks[index - 1];
    const after = columnTasks[index];
    if (before && after) return (before.position + after.position) / 2;
    if (before) return before.position + 1;
    if (after) return after.position - 1;
    return 0;
  };

  // Drag & Drop handler: cambiar de columna y/o reordenar dentro de la columna
  const handleDragEnd = async (result) => {
    if (isViewer) return;
    const { destination, source, draggableId } = result;

    // Si no hay destino o es la misma posición, no hacer nada
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const allowedStatuses = STATUS_COLUMNS.map(c => c.status);
    const newStatus = destination.droppableId;
    const oldStatus = source.droppableId;
    const sameColumn = newStatus === oldStatus;

    // Solo permitir mover entre las columnas conocidas
    if (!allowedStatuses.includes(newStatus) || !allowedStatuses.includes(oldStatus)) return;
    // Las completadas se ordenan por fecha de cierre, no a mano
    if (sameColumn && newStatus === 'completed') return;

    const taskId = draggableId;
    const task = tasks.find(t => t.id === taskId);
    if (!task || !canEditTask(task)) return;

    // Vecinas visibles en la columna destino (sin la tarjeta que se mueve)
    const destinationTasks = tasksByStatus[newStatus].filter(t => t.id !== taskId);
    const newPosition = positionAt(destinationTasks, destination.index);

    // Actualizar optimistamente el estado local
    const updatedTask = { ...task, status: newStatus, position: newPosition };
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));

    if (!sameColumn) {
      setStats(prev => ({
        ...prev,
        byStatus: {
          ...prev?.byStatus,
          [oldStatus]: Math.max((prev?.byStatus?.[oldStatus] || 1) - 1, 0),
          [newStatus]: (prev?.byStatus?.[newStatus] || 0) + 1
        }
      }));
    }

    // Llamar al API
    try {
      const response = await taskService.updateTaskStatus(taskId, newStatus.toUpperCase(), newPosition);
      const serverTask = normalizeTask(response.data || response);
      setTasks(prev => prev.map(t => t.id === taskId ? serverTask : t));
    } catch (err) {
      // Revertir si falla
      setTasks(prev => prev.map(t => t.id === taskId ? task : t));
      if (!sameColumn) {
        setStats(prev => ({
          ...prev,
          byStatus: {
            ...prev?.byStatus,
            [oldStatus]: (prev?.byStatus?.[oldStatus] || 0) + 1,
            [newStatus]: Math.max((prev?.byStatus?.[newStatus] || 1) - 1, 0)
          }
        }));
      }
      setError(err.response?.data?.message || 'Error al actualizar el estado');
    }
  };

  // Límite WIP (solo OWNER/ADMIN). null quita el límite.
  const handleSaveWipLimit = async (status, value) => {
    const limit = value === '' || value === null ? null : Math.max(1, parseInt(value, 10) || 1);
    const previous = wipLimits;
    setWipLimits(prev => {
      const next = { ...prev };
      if (limit === null) delete next[status];
      else next[status] = limit;
      return next;
    });
    document.body.click(); // cerrar el popover
    try {
      await workspaceService.updateWipLimits(currentWorkspace.id, { [status.toUpperCase()]: limit });
    } catch (err) {
      setWipLimits(previous);
      setError(err.response?.data?.message || 'Error al guardar el límite');
    }
  };

  // Agrupar tareas por estado
  const allTasks = Array.isArray(tasks) ? tasks : [];

  const filteredTasks = allTasks.filter((t) => {
    // Búsqueda
    if (filters.q.trim()) {
      const q = filters.q.trim().toLowerCase();
      const hay = `${t.title || ''} ${t.description || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    // Prioridad
    if (filters.priority) {
      if ((t.priority || '').toLowerCase() !== filters.priority) return false;
    }

    // Categoría
    if (filters.categoryId) {
      const taskCategoryId = t.categoryId || t.category?.id || '';
      if (taskCategoryId !== filters.categoryId) return false;
    }

    // Filtros rápidos
    // En el tablero personal no hay asignaciones: "Mis tareas" y "Sin asignar" no aplican
    const assignedId = t.assignedTo || t.assignee?.id || '';
    if (!currentWorkspace?.isPersonal) {
      if (quickFilters.includes('mine') && assignedId !== user?.id) return false;
      if (quickFilters.includes('unassigned') && assignedId) return false;
    }
    if (quickFilters.includes('high') && t.priority !== 'high') return false;
    if (quickFilters.includes('overdue') && !isOverdue(t)) return false;

    // Asignación
    if (filters.assignee) {
      const assignedTo = t.assignedTo || t.assignee?.id || '';
      if (filters.assignee === 'UNASSIGNED') {
        if (assignedTo) return false;
      } else {
        if (assignedTo !== filters.assignee) return false;
      }
    }

    return true;
  });

  // Orden manual (position) en cada columna; las completadas, de la más reciente a la más antigua
  const inColumn = (status) => filteredTasks.filter(t => t.status === status).sort(byPosition);
  const allCompleted = filteredTasks.filter(t => t.status === 'completed').sort(byCompletedDesc);
  const tasksByStatus = {
    backlog: inColumn('backlog'),
    pending: inColumn('pending'),
    in_progress: inColumn('in_progress'),
    in_review: inColumn('in_review'),
    completed: allCompleted.slice(0, completedLimit)
  };
  // Para WIP se cuenta la columna completa, aunque haya filtros activos
  const countInColumn = (status) => allTasks.filter(t => t.status === status).length;

  const hasActiveFilters = !!(filters.q.trim() || filters.priority || filters.categoryId || filters.assignee || quickFilters.length);
  const activeFilterCount =
    (filters.q.trim() ? 1 : 0) +
    (filters.priority ? 1 : 0) +
    (filters.categoryId ? 1 : 0) +
    (filters.assignee ? 1 : 0);
  const assigneeOptions = (() => {
    const opts = [
      { value: '', label: 'Todos' },
      { value: 'UNASSIGNED', label: 'Sin asignar' }
    ];

    const memberList = Array.isArray(members) ? members : [];
    const seen = new Set();
    memberList.forEach((m) => {
      const id = m.userId || m.user?.id;
      if (!id || seen.has(id)) return;
      seen.add(id);
      const name = m.user?.name || m.user?.email || 'Usuario';
      const suffix = user?.id && id === user.id ? ' (tú)' : '';
      opts.push({ value: id, label: `${name}${suffix}` });
    });

    // En workspaces personales puede no haber lista de miembros, pero igual permitimos filtrar por "tú"
    if (user?.id && !seen.has(user.id)) {
      opts.push({ value: user.id, label: `${user.name || user.email || 'Tú'} (tú)` });
    }

    return opts;
  })();

  const TaskCard = ({ task, index }) => (
    <Draggable draggableId={task.id} index={index} isDragDisabled={!canEditTask(task)}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`kanban-task-card mb-2 ${snapshot.isDragging ? 'dragging' : ''} ${isOverdue(task) ? 'is-overdue' : ''}`}
          data-priority={task.priority}
          data-status={task.status}
          onClick={() => handleEditTask(task)}
          style={{
            ...provided.draggableProps.style,
            cursor: canEditTask(task) ? 'grab' : 'pointer'
          }}
        >
          <Card.Body className="p-3">
            <div className="task-key mb-1">{formatTaskKey(task.number)}</div>
            <div className="d-flex justify-content-between align-items-start mb-2">
              <h6 className="task-title mb-0 flex-grow-1" style={{ fontSize: '0.95rem' }}>
                {task.title}
              </h6>
              {!isViewer && !canEditTask(task) && (
                <FiLock
                  size={13}
                  className="text-muted flex-shrink-0 ms-1"
                  title="Solo la persona asignada, quien la creó o un administrador pueden moverla"
                />
              )}
              {canEditTask(task) && (
                <div className="d-flex gap-1">
                  <button
                    className="btn-icon btn-icon-edit btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditTask(task);
                    }}
                    title="Editar"
                  >
                    <FiEdit2 size={14} />
                  </button>
                  {canDeleteTask(task) && (
                    <button
                      className="btn-icon btn-icon-delete btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTaskToDelete(task);
                      }}
                      title="Eliminar"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {task.description && (
              <p className="task-description text-muted mb-2" style={{ fontSize: '0.85rem' }}>
                {task.description}
              </p>
            )}

            <div className="d-flex gap-2 flex-wrap mb-2">
              <Badge bg={task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'success'} style={{ fontSize: '0.7rem' }}>
                {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
              </Badge>
              {task.category && (
                <span className="task-category-badge" style={{ borderColor: task.category.color || '#3B82F6', fontSize: '0.75rem' }}>
                  <span
                    className="category-dot"
                    style={{ backgroundColor: task.category.color || '#3B82F6', width: '6px', height: '6px' }}
                  />
                  {task.category.name}
                </span>
              )}
            </div>

            {staleDays(task) > 0 && (
              <div className="task-stale-badge mb-2" title="Lleva varios días sin cambiar de estado">
                <FiAlertTriangle size={11} />
                {staleDays(task)} días sin moverse
              </div>
            )}

            {!task.assignee && !currentWorkspace?.isPersonal && task.status !== 'completed' && (
              <div className="d-flex align-items-center gap-1 mb-2 text-muted" style={{ fontSize: '0.75rem' }}>
                <FiUserX size={12} />
                Sin asignar
              </div>
            )}

            {task.assignee && (
              <div className="d-flex align-items-center gap-1 mb-2">
                <span
                  className="d-inline-flex align-items-center justify-content-center rounded-circle text-white"
                  style={{ width: 20, height: 20, fontSize: '0.65rem', backgroundColor: 'var(--primary)' }}
                >
                  {task.assignee.name?.charAt(0)?.toUpperCase()}
                </span>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>{task.assignee.name}</span>
              </div>
            )}

            {task.checklistItems?.length > 0 && (() => {
              const done = task.checklistItems.filter((i) => i.isCompleted).length;
              const total = task.checklistItems.length;
              const pct = Math.round((done / total) * 100);
              return (
                <div className="d-flex align-items-center gap-2 mb-2" style={{ fontSize: '0.75rem' }}>
                  <ProgressBar
                    now={pct}
                    variant={pct === 100 ? 'success' : 'primary'}
                    style={{ height: 5, flex: 1, borderRadius: 3 }}
                  />
                  <span className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                    {done}/{total}
                  </span>
                </div>
              );
            })()}

            <div className="task-dates">
              {task.dueDate && (
                <div className={isOverdue(task) ? 'task-overdue-date' : 'text-muted'} style={{ fontSize: '0.8rem' }}>
                  <FiCalendar size={12} className="me-1" style={{ display: 'inline' }} />
                  Para: {formatDate(task.dueDate)}
                  {isOverdue(task) && <span className="task-overdue-label ms-1">· Vencida</span>}
                </div>
              )}
              {task.status === 'completed' && task.completedAt && (
                <div className="text-success" style={{ fontSize: '0.75rem' }}>
                  <FiCheckCircle size={11} className="me-1" style={{ display: 'inline' }} />
                  {humanizeDate(task.completedAt)}
                </div>
              )}
              {task.statusUpdatedAt && task.status !== 'completed' && (
                <div className="text-muted" style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                  Movida {humanizeDate(task.statusUpdatedAt)}
                </div>
              )}
            </div>
          </Card.Body>
        </Card>
      )}
    </Draggable>
  );

  // Contador de la columna con límite WIP: "4/3" en rojo si se excede. OWNER/ADMIN lo editan con clic.
  const WipBadge = ({ status, count }) => {
    const limit = wipLimits[status];
    const exceeded = limit && count > limit;
    const badge = (
      <Badge
        bg="secondary"
        className={`ms-auto ${exceeded ? 'wip-exceeded' : ''} ${isManager && !currentWorkspace?.isPersonal ? 'wip-editable' : ''}`}
        title={exceeded ? `Límite WIP excedido (${limit})` : limit ? `Límite WIP: ${limit}` : undefined}
      >
        {limit ? `${count}/${limit}` : count}
      </Badge>
    );
    if (!isManager || currentWorkspace?.isPersonal) return badge;

    const popover = (
      <Popover>
        <Popover.Header as="h6" className="small">Límite de tareas (WIP)</Popover.Header>
        <Popover.Body>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveWipLimit(status, e.currentTarget.elements.limit.value);
            }}
          >
            <Form.Control name="limit" type="number" min={1} size="sm" defaultValue={limit || ''} placeholder="Sin límite" autoFocus />
            <div className="d-flex gap-2 mt-2">
              <button type="submit" className="btn btn-sm btn-primary flex-grow-1">Guardar</button>
              {limit && (
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => handleSaveWipLimit(status, null)}>
                  Quitar
                </button>
              )}
            </div>
          </Form>
        </Popover.Body>
      </Popover>
    );
    return (
      <OverlayTrigger trigger="click" placement="bottom" rootClose overlay={popover}>
        {badge}
      </OverlayTrigger>
    );
  };

  const KanbanColumn = ({ status, title, icon: Icon, color, tasks: columnTasks, footer }) => (
    <Col md={6} lg={4} xl className="mb-4 mb-xl-0">
      <div className="kanban-column" data-status={status} style={{ '--kanban-accent': color }}>
        <div className="kanban-column-header">
          <div className="d-flex align-items-center gap-2 mb-2">
            <Icon size={18} style={{ color }} />
            <span className="kanban-column-title">{title}</span>
            {WIP_COLUMNS.includes(status) ? (
              <WipBadge status={status} count={countInColumn(status)} />
            ) : (
              <Badge bg="secondary" className="ms-auto">{columnTasks.length}</Badge>
            )}
          </div>
        </div>

        <Droppable droppableId={status}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`kanban-tasks ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
            >
              {columnTasks.length === 0 ? (
                <div className="text-center py-3">
                  <p className="text-muted small mb-0">Sin tareas</p>
                </div>
              ) : (
                columnTasks.map((task, index) => (
                  <TaskCard key={task.id} task={task} index={index} />
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
        {footer}
      </div>
    </Col>
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Cargando dashboard...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {isViewer && (
        <Alert variant="info" className="mb-4 py-2">
          Estás viendo este tablero en modo <strong>solo lectura</strong>. No podés crear ni modificar tareas.
        </Alert>
      )}

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-4">
          {error}
        </Alert>
      )}

      {/* Stats Bar con botón de agregar */}
      <div className="stats-bar-container mb-4">
        <div className="stats-cards">
          <div className="stat-card-mini">
            <FiList className="stat-card-icon" style={{ color: '#0d6efd' }} />
            <div className="stat-info">
              <span className="stat-card-number">{stats?.total || 0}</span>
              <span className="stat-card-label">Total</span>
            </div>
          </div>
          {STATUS_COLUMNS.map(({ status, title, icon: Icon, color }) => (
            <div className="stat-card-mini" key={status}>
              <Icon className="stat-card-icon" style={{ color }} />
              <div className="stat-info">
                <span className="stat-card-number">{stats?.byStatus?.[status] || 0}</span>
                <span className="stat-card-label">{title}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="stats-actions d-flex align-items-center gap-2 flex-wrap justify-content-end">
          <button
            type="button"
            className="add-task-btn add-task-btn--ghost"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refrescar dashboard"
          >
            <FiCheckSquare size={16} style={{ color: 'var(--primary)' }} />
            {refreshing ? <Spinner animation="border" size="sm" /> : <FiRefreshCw size={18} />}
          </button>
          <button
            type="button"
            className="add-task-btn add-task-btn--ghost"
            onClick={() => { setWeeklyReportOffset(0); setShowWeeklyReport(true); }}
            title="Reporte semanal"
          >
            <FiBarChart2 size={18} />
          </button>
          <button
            type="button"
            className="add-task-btn add-task-btn--ghost"
            onClick={() => setShowFilters(true)}
            title="Filtros"
          >
            <FiFilter size={18} />
            {activeFilterCount > 0 && (
              <Badge bg="secondary" pill style={{ fontSize: '0.65rem' }}>
                {activeFilterCount}
              </Badge>
            )}
          </button>
          <button
            type="button"
            className="add-task-btn"
            onClick={() => {
              setTaskToEdit(null);
              setShowTaskModal(true);
            }}
            disabled={isViewer}
            title={isViewer ? 'Solo lectura: no podés crear tareas en este tablero' : undefined}
          >
            <FiPlus size={18} />
            <span className="add-task-text">Nueva</span>
          </button>
        </div>
      </div>

      {/* Filtros rápidos */}
      <div className="quick-filters mb-3">
        {QUICK_FILTERS
          .filter(f => !(currentWorkspace?.isPersonal && (f.key === 'mine' || f.key === 'unassigned')))
          .map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className={`quick-filter-chip ${quickFilters.includes(key) ? 'active' : ''}`}
              onClick={() => toggleQuickFilter(key)}
              aria-pressed={quickFilters.includes(key)}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        {quickFilters.length > 0 && (
          <button type="button" className="quick-filter-clear" onClick={() => {
            setQuickFilters([]);
            try { localStorage.removeItem(QUICK_FILTERS_KEY); } catch { /* sin storage */ }
          }}>
            <FiX size={13} /> Limpiar
          </button>
        )}
      </div>

      {/* Kanban Board con Drag & Drop */}
      {!Array.isArray(tasks) || tasks.length === 0 ? (
        <Row>
          <Col md={12}>
            <Card className="shadow-sm">
              <Card.Body className="py-4">
                <div className="text-center">
                  <p className="text-muted mb-0">No tienes tareas todavía</p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="kanban-board" ref={kanbanBoardRef}>
            <Row ref={kanbanScrollRef} onScroll={handleKanbanScroll}>
              {STATUS_COLUMNS.filter(c => c.status !== 'completed').map(({ status, title, icon, color }) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  title={title}
                  icon={icon}
                  color={color}
                  tasks={tasksByStatus[status]}
                />
              ))}
              <KanbanColumn
                status="completed"
                title="Completada"
                icon={FiCheckCircle}
                color="#198754"
                tasks={tasksByStatus.completed}
                footer={<>{allCompleted.length > completedLimit ? (
                  <div className="text-center py-2">
                    <div className="d-flex gap-2 justify-content-center flex-wrap">
                      {[20, 30, 40, 100].filter(n => n > completedLimit && n <= allCompleted.length).slice(0, 2).map(n => (
                        <button
                          key={n}
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => setCompletedLimit(n)}
                          style={{ fontSize: '0.75rem' }}
                        >
                          Ver {n}
                        </button>
                      ))}
                      {completedLimit < allCompleted.length && (
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => setCompletedLimit(allCompleted.length)}
                          style={{ fontSize: '0.75rem' }}
                        >
                          Todas ({allCompleted.length})
                        </button>
                      )}
                    </div>
                    <p className="text-muted mb-0 mt-1" style={{ fontSize: '0.7rem' }}>
                      Mostrando {tasksByStatus.completed.length} de {allCompleted.length}
                    </p>
                  </div>
                ) : null}
                {archivedCount > 0 && (
                  <p className="text-muted text-center mb-0 mt-1" style={{ fontSize: '0.7rem' }}>
                    <FiArchive size={11} className="me-1" />
                    {archivedCount} completadas hace más de {archiveDays} días · <Link to="/export">ver en Reportes</Link>
                  </p>
                )}</>}
              />
            </Row>
            <div className="kanban-dots">
              {STATUS_COLUMNS.map(({ title: label }, i) => (
                <button
                  key={label}
                  className={`kanban-dot ${activeColumn === i ? 'active' : ''}`}
                  onClick={() => scrollToColumn(i)}
                  aria-label={label}
                />
              ))}
            </div>
          </div>
        </DragDropContext>
      )}

      {/* Sidebar / Offcanvas de filtros (para no alterar el layout del dashboard) */}
      <Offcanvas show={showFilters} onHide={() => setShowFilters(false)} placement="end">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Filtros</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div className="mb-2">
            <small className="text-muted">
              Mostrando {filteredTasks.length} tarea(s)
              {hasActiveFilters ? ' (filtradas)' : ''}
            </small>
          </div>

          <Form.Group className="mb-3">
            <Form.Label className="small text-muted mb-1">Buscar</Form.Label>
            <Form.Control
              size="sm"
              placeholder="Título o descripción…"
              value={filters.q}
              onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="small text-muted mb-1">Prioridad</Form.Label>
            <Form.Select
              size="sm"
              value={filters.priority}
              onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
            >
              <option value="">Todas</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="small text-muted mb-1">Categoría</Form.Label>
            <Form.Select
              size="sm"
              value={filters.categoryId}
              onChange={(e) => setFilters((prev) => ({ ...prev, categoryId: e.target.value }))}
            >
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="small text-muted mb-1">Asignación</Form.Label>
            <Form.Select
              size="sm"
              value={filters.assignee}
              onChange={(e) => setFilters((prev) => ({ ...prev, assignee: e.target.value }))}
            >
              {assigneeOptions.map((o) => (
                <option key={o.value || 'ALL'} value={o.value}>{o.label}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setFilters({ q: '', priority: '', categoryId: '', assignee: '' })}
              disabled={!hasActiveFilters}
            >
              <FiX className="me-1" />
              Limpiar
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setShowFilters(false)}
            >
              Listo
            </button>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Modals */}
      {isViewer || (taskToEdit && !canEditTask(taskToEdit)) ? (
        <TaskViewModal
          show={showTaskModal}
          onHide={handleCloseTaskModal}
          task={taskToEdit}
        />
      ) : (
        <TaskForm
          show={showTaskModal}
          onHide={handleCloseTaskModal}
          onTaskCreated={handleTaskCreated}
          onTaskUpdated={handleTaskUpdated}
          onWarning={(msg) => setError(msg)}
          taskToEdit={taskToEdit}
          categories={categories}
          workspaceId={currentWorkspace?.id}
          workspaceMembers={members}
        />
      )}

      <ConfirmModal
        show={!!taskToDelete}
        onHide={() => setTaskToDelete(null)}
        onConfirm={handleDeleteTask}
        title="Eliminar tarea"
        message={`¿Estás seguro de eliminar la tarea ${formatTaskKey(taskToDelete?.number)} "${taskToDelete?.title}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
        loading={deletingTask}
      />

      <WeeklyReportModal
        show={showWeeklyReport}
        onHide={() => setShowWeeklyReport(false)}
        initialWeekOffset={weeklyReportOffset}
        workspaceId={currentWorkspace?.id}
      />
    </MainLayout>
  );
};

export default DashboardPage;
