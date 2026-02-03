import { useState, useEffect, useRef, useCallback } from 'react';
import { Row, Col, Card, Spinner, Alert, Badge } from 'react-bootstrap';
import { FiCheckCircle, FiClock, FiLoader, FiPlus, FiEdit2, FiTrash2, FiCalendar, FiList } from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';
import TaskForm from '../../components/tasks/TaskForm';
import ConfirmModal from '../../components/common/ConfirmModal';
import taskService from '../../services/taskService';
import categoryService from '../../services/categoryService';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Task modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deletingTask, setDeletingTask] = useState(false);

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
    fetchData();
  }, []);

  // Normalizar status y priority a minúsculas
  const normalizeTask = (task) => ({
    ...task,
    status: task.status?.toLowerCase() || 'pending',
    priority: task.priority?.toLowerCase() || 'medium'
  });

  const fetchData = async () => {
    try {
      const [statsResponse, categoriesResponse, tasksResponse] = await Promise.all([
        taskService.getStats(),
        categoryService.getCategories(),
        taskService.getTasks()
      ]);
      console.log("statsResponse",statsResponse)
      setStats(statsResponse.data || statsResponse);

      // Asegurar que categories sea un array
      const categoriesData = categoriesResponse.data || categoriesResponse;
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);

      // Asegurar que tasks sea un array - puede venir en tasksResponse.data.tasks
      let tasksData = [];
      if (tasksResponse.data) {
        if (Array.isArray(tasksResponse.data)) {
          tasksData = tasksResponse.data;
        } else if (tasksResponse.data.tasks && Array.isArray(tasksResponse.data.tasks)) {
          tasksData = tasksResponse.data.tasks;
        }
      }
      // Normalizar tasks
      const normalizedTasks = tasksData.map(normalizeTask);
      setTasks(normalizedTasks);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // Category handlers
  const handleCategoryCreated = (newCategory) => {
    const categoryData = newCategory.data || newCategory;
    setCategories(prev => [...(Array.isArray(prev) ? prev : []), categoryData]);
  };

  const handleCategoryUpdated = (updatedCategory) => {
    const categoryData = updatedCategory.data || updatedCategory;
    setCategories(prev => (Array.isArray(prev) ? prev : []).map(cat =>
      cat.id === categoryData.id ? categoryData : cat
    ));
  };

  const handleDeleteCategory = async () => {
    // Si es necesario eliminar categoría desde el tablero, implementar aquí
  };

  // Task handlers
  const handleTaskCreated = (newTask) => {
    const taskData = normalizeTask(newTask.data || newTask);
    setTasks(prev => [taskData, ...(Array.isArray(prev) ? prev : [])]);
    setShowTaskModal(false);
    // Actualizar stats
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
      // Actualizar stats
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

  const handleToggleTaskStatus = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const response = await taskService.updateTaskStatus(task.id, newStatus.toUpperCase());
      const updatedTaskData = normalizeTask(response.data || response);
      setTasks(prev => (Array.isArray(prev) ? prev : []).map(t => t.id === task.id ? updatedTaskData : t));
      // Actualizar stats
      setStats(prev => ({
        ...prev,
        byStatus: {
          ...prev?.byStatus,
          [task.status]: Math.max((prev?.byStatus?.[task.status] || 1) - 1, 0),
          [newStatus]: (prev?.byStatus?.[newStatus] || 0) + 1
        }
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar el estado');
    }
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      low: 'success',
      medium: 'warning',
      high: 'danger'
    };
    const labels = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta'
    };
    return <Badge bg={variants[priority]}>{labels[priority]}</Badge>;
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'secondary',
      in_progress: 'info',
      completed: 'success'
    };
    const labels = {
      pending: 'Pendiente',
      in_progress: 'En Progreso',
      completed: 'Completada'
    };
    return <Badge bg={variants[status]}>{labels[status]}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  // Agrupar tareas por estado
  const tasksByStatus = {
    pending: (Array.isArray(tasks) ? tasks : []).filter(t => t.status === 'pending'),
    in_progress: (Array.isArray(tasks) ? tasks : []).filter(t => t.status === 'in_progress'),
    completed: (Array.isArray(tasks) ? tasks : []).filter(t => t.status === 'completed')
  };

  const TaskCard = ({ task }) => (
    <Card className="kanban-task-card mb-2" onClick={() => handleEditTask(task)} style={{ cursor: 'pointer' }}>
      <Card.Body className="p-3">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h6 className="mb-0 flex-grow-1" style={{ fontSize: '0.95rem' }}>
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
          <p className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>
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

        {task.dueDate && (
          <div className="text-muted" style={{ fontSize: '0.8rem' }}>
            <FiCalendar size={12} className="me-1" style={{ display: 'inline' }} />
            {formatDate(task.dueDate)}
          </div>
        )}
      </Card.Body>
    </Card>
  );

  const KanbanColumn = ({ status, title, icon: Icon, color, tasks: columnTasks }) => (
    <Col lg={4} md={6} className="mb-4 mb-lg-0">
      <div className="kanban-column">
        <div className="kanban-column-header">
          <div className="d-flex align-items-center gap-2 mb-2">
            <Icon size={18} style={{ color }} />
            <span className="kanban-column-title">{title}</span>
            <Badge bg="secondary" className="ms-auto">{columnTasks.length}</Badge>
          </div>
        </div>

        <div className="kanban-tasks">
          {columnTasks.length === 0 ? (
            <div className="text-center py-3">
              <p className="text-muted small mb-0">Sin tareas</p>
            </div>
          ) : (
            columnTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))
          )}
        </div>
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

      {/* Kanban Board */}
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
      )}

      {/* Modals */}
      <TaskForm
        show={showTaskModal}
        onHide={handleCloseTaskModal}
        onTaskCreated={handleTaskCreated}
        onTaskUpdated={handleTaskUpdated}
        taskToEdit={taskToEdit}
        categories={categories}
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
