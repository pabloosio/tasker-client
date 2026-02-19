import { useState, useEffect, useRef, useCallback } from 'react';
import { Row, Col, Card, Spinner, Alert, Badge, ProgressBar } from 'react-bootstrap';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FiCheckCircle, FiClock, FiLoader, FiPlus, FiEdit2, FiTrash2, FiCalendar, FiList } from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';
import TaskForm from '../../components/tasks/TaskForm';
import ConfirmModal from '../../components/common/ConfirmModal';
import taskService from '../../services/taskService';
import categoryService from '../../services/categoryService';
import workspaceService from '../../services/workspaceService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { humanizeDate, formatDate } from '../../utils/dateUtils';

const DashboardPage = () => {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Task modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deletingTask, setDeletingTask] = useState(false);

  // Completadas visibles
  const [completedLimit, setCompletedLimit] = useState(10);

  // Kanban mobile slider
  const [activeColumn, setActiveColumn] = useState(0);
  const kanbanScrollRef = useRef(null);

  const handleKanbanScroll = useCallback(() => {
    const el = kanbanScrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const columnWidth = el.firstElementChild?.offsetWidth || 1;
    const index = Math.round(scrollLeft / columnWidth);
    setActiveColumn(Math.min(index, 2));
  }, []);

  const scrollToColumn = useCallback((index) => {
    const el = kanbanScrollRef.current;
    if (!el || !el.children[index]) return;
    el.children[index].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, []);

  useEffect(() => {
    if (currentWorkspace) {
      fetchData();
    }
  }, [currentWorkspace?.id]);

  // Normalizar status y priority a minúsculas
  const normalizeTask = (task) => ({
    ...task,
    status: task.status?.toLowerCase() || 'pending',
    priority: task.priority?.toLowerCase() || 'medium'
  });

  const fetchData = async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    const wsParams = { workspaceId: currentWorkspace.id };

    try {
      const promises = [
        taskService.getStats(wsParams),
        categoryService.getCategories(wsParams),
        taskService.getTasks({ limit: 100, ...wsParams })
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

      let tasksData = [];
      if (tasksResponse.data) {
        if (Array.isArray(tasksResponse.data)) {
          tasksData = tasksResponse.data;
        } else if (tasksResponse.data.tasks && Array.isArray(tasksResponse.data.tasks)) {
          tasksData = tasksResponse.data.tasks;
        }
      }
      const normalizedTasks = tasksData.map(normalizeTask);
      setTasks(normalizedTasks);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
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

  // Drag & Drop handler
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    // Si no hay destino o es la misma posición, no hacer nada
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const allowedStatuses = ['pending', 'in_progress', 'completed'];

    // Si es dentro de la misma columna, no cambiamos status ni llamamos API
    if (destination.droppableId === source.droppableId) return;

    const newStatus = destination.droppableId;
    const oldStatus = source.droppableId;

    // Solo permitir mover entre las 3 columnas conocidas
    if (!allowedStatuses.includes(newStatus) || !allowedStatuses.includes(oldStatus)) return;
    const taskId = draggableId;

    // Encontrar la tarea
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Actualizar optimistamente el estado local
    const updatedTask = { ...task, status: newStatus };
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));

    // Actualizar stats optimistamente
    setStats(prev => ({
      ...prev,
      byStatus: {
        ...prev?.byStatus,
        [oldStatus]: Math.max((prev?.byStatus?.[oldStatus] || 1) - 1, 0),
        [newStatus]: (prev?.byStatus?.[newStatus] || 0) + 1
      }
    }));

    // Llamar al API
    try {
      const response = await taskService.updateTaskStatus(taskId, newStatus.toUpperCase());
      const serverTask = normalizeTask(response.data || response);
      setTasks(prev => prev.map(t => t.id === taskId ? serverTask : t));
    } catch (err) {
      // Revertir si falla
      setTasks(prev => prev.map(t => t.id === taskId ? task : t));
      setStats(prev => ({
        ...prev,
        byStatus: {
          ...prev?.byStatus,
          [oldStatus]: (prev?.byStatus?.[oldStatus] || 0) + 1,
          [newStatus]: Math.max((prev?.byStatus?.[newStatus] || 1) - 1, 0)
        }
      }));
      setError(err.response?.data?.message || 'Error al actualizar el estado');
    }
  };

  // En workspaces compartidos, poner primero las tareas asignadas al usuario actual
  const sortByAssignee = (taskList) => {
    if (!user || currentWorkspace?.isPersonal) return taskList;
    return [...taskList].sort((a, b) => {
      const aIsMe = a.assignedTo === user.id ? 0 : 1;
      const bIsMe = b.assignedTo === user.id ? 0 : 1;
      return aIsMe - bIsMe;
    });
  };

  // Agrupar tareas por estado
  const allTasks = Array.isArray(tasks) ? tasks : [];
  const allCompleted = sortByAssignee(allTasks.filter(t => t.status === 'completed'));
  const tasksByStatus = {
    pending: sortByAssignee(allTasks.filter(t => t.status === 'pending')),
    in_progress: sortByAssignee(allTasks.filter(t => t.status === 'in_progress')),
    completed: allCompleted.slice(0, completedLimit)
  };

  const TaskCard = ({ task, index }) => (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`kanban-task-card mb-2 ${snapshot.isDragging ? 'dragging' : ''}`}
          data-priority={task.priority}
          data-status={task.status}
          onClick={() => handleEditTask(task)}
          style={{
            ...provided.draggableProps.style,
            cursor: 'grab'
          }}
        >
          <Card.Body className="p-3">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <h6 className="task-title mb-0 flex-grow-1" style={{ fontSize: '0.95rem' }}>
                {task.title}
              </h6>
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
              </div>
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
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                  <FiCalendar size={12} className="me-1" style={{ display: 'inline' }} />
                  {formatDate(task.dueDate)}
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

  const KanbanColumn = ({ status, title, icon: Icon, color, tasks: columnTasks, footer }) => (
    <Col lg={4} md={6} className="mb-4 mb-lg-0">
      <div className="kanban-column" data-status={status} style={{ '--kanban-accent': color }}>
        <div className="kanban-column-header">
          <div className="d-flex align-items-center gap-2 mb-2">
            <Icon size={18} style={{ color }} />
            <span className="kanban-column-title">{title}</span>
            <Badge bg="secondary" className="ms-auto">{columnTasks.length}</Badge>
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
          <div className="stat-card-mini">
            <FiClock className="stat-card-icon" style={{ color: '#ffc107' }} />
            <div className="stat-info">
              <span className="stat-card-number">{stats?.byStatus?.pending || 0}</span>
              <span className="stat-card-label">Pendientes</span>
            </div>
          </div>
          <div className="stat-card-mini">
            <FiLoader className="stat-card-icon" style={{ color: '#0dcaf0' }} />
            <div className="stat-info">
              <span className="stat-card-number">{stats?.byStatus?.in_progress || 0}</span>
              <span className="stat-card-label">En Progreso</span>
            </div>
          </div>
          <div className="stat-card-mini">
            <FiCheckCircle className="stat-card-icon" style={{ color: '#198754' }} />
            <div className="stat-info">
              <span className="stat-card-number">{stats?.byStatus?.completed || 0}</span>
              <span className="stat-card-label">Completadas</span>
            </div>
          </div>
        </div>
        <button
          className="add-task-btn"
          onClick={() => {
            setTaskToEdit(null);
            setShowTaskModal(true);
          }}
        >
          <FiPlus size={18} />
          <span className="add-task-text">Nueva</span>
        </button>
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
          <div className="kanban-board">
            <Row ref={kanbanScrollRef} onScroll={handleKanbanScroll}>
              <KanbanColumn
                status="pending"
                title="Pendiente"
                icon={FiClock}
                color="#ffc107"
                tasks={tasksByStatus.pending}
              />
              <KanbanColumn
                status="in_progress"
                title="En Progreso"
                icon={FiLoader}
                color="#0dcaf0"
                tasks={tasksByStatus.in_progress}
              />
              <KanbanColumn
                status="completed"
                title="Completada"
                icon={FiCheckCircle}
                color="#198754"
                tasks={tasksByStatus.completed}
                footer={allCompleted.length > completedLimit ? (
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
              />
            </Row>
            <div className="kanban-dots">
              {['Pendiente', 'En Progreso', 'Completada'].map((label, i) => (
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

      {/* Modals */}
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

      <ConfirmModal
        show={!!taskToDelete}
        onHide={() => setTaskToDelete(null)}
        onConfirm={handleDeleteTask}
        title="Eliminar tarea"
        message={`¿Estás seguro de eliminar la tarea "${taskToDelete?.title}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
        loading={deletingTask}
      />
    </MainLayout>
  );
};

export default DashboardPage;
