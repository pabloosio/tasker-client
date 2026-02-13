import { useState, useEffect, useRef } from 'react';
import { Modal, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { FiCheckSquare, FiEdit2, FiClock, FiLoader, FiCheckCircle, FiPlus, FiTrash2 } from 'react-icons/fi';
import taskService from '../../services/taskService';
import checklistService from '../../services/checklistService';
import TaskChecklist from './TaskChecklist';
import './TaskChecklist.css';

const TaskForm = ({ show, onHide, onTaskCreated, onTaskUpdated, taskToEdit, categories = [], workspaceId, workspaceMembers = [], onWarning }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    dueDate: '',
    categoryId: '',
    assignedTo: ''
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const descRef = useRef(null);

  // Checklist draft (solo para nueva tarea)
  const [draftChecklistItems, setDraftChecklistItems] = useState([]);
  const [newChecklistContent, setNewChecklistContent] = useState('');

  const isEditing = !!taskToEdit;

  const priorities = [
    { value: 'low', label: 'Baja', color: '#198754' },
    { value: 'medium', label: 'Media', color: '#ffc107' },
    { value: 'high', label: 'Alta', color: '#dc3545' }
  ];

  const statuses = [
    { value: 'pending', label: 'Pendiente', color: '#ffc107', icon: FiClock },
    { value: 'in_progress', label: 'En Progreso', color: '#0dcaf0', icon: FiLoader },
    { value: 'completed', label: 'Completada', color: '#198754', icon: FiCheckCircle }
  ];

  useEffect(() => {
    if (taskToEdit) {
      setFormData({
        title: taskToEdit.title || '',
        description: taskToEdit.description || '',
        priority: taskToEdit.priority || 'medium',
        status: taskToEdit.status || 'pending',
        dueDate: taskToEdit.dueDate ? taskToEdit.dueDate.split('T')[0] : '',
        categoryId: taskToEdit.categoryId || '',
        assignedTo: taskToEdit.assignedTo || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        status: 'pending',
        dueDate: '',
        categoryId: '',
        assignedTo: ''
      });
    }

    // Reset draft checklist cuando se abre el modal en modo "nueva tarea"
    if (!taskToEdit) {
      setDraftChecklistItems([]);
      setNewChecklistContent('');
    }
  }, [taskToEdit, show]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    const dataToSend = {
      ...formData,
      status: formData.status.toUpperCase(),
      priority: formData.priority.toUpperCase(),
      categoryId: formData.categoryId || null,
      dueDate: formData.dueDate || null,
      assignedTo: formData.assignedTo || null,
      workspaceId: workspaceId || null
    };

    try {
      if (isEditing) {
        const response = await taskService.updateTask(taskToEdit.id, dataToSend);
        onTaskUpdated(response.data);
      } else {
        const response = await taskService.createTask(dataToSend);
        const createdTask = response?.data?.data || response?.data;
        const createdTaskId = createdTask?.id;

        let checklistFailedCount = 0;

        // Crear checklist items (si el usuario agregó en el borrador)
        const itemsToCreate = draftChecklistItems
          .map((i) => (typeof i === 'string' ? i : i?.content))
          .filter((c) => (c || '').trim().length > 0)
          .map((c) => c.trim());

        if (createdTaskId && itemsToCreate.length > 0) {
          for (const content of itemsToCreate) {
            try {
              await checklistService.addItem(createdTaskId, content);
            } catch {
              checklistFailedCount += 1;
            }
          }
        }

        // Si pudimos crear checklist, traer la tarea actualizada con include de checklistItems
        let finalResponse = response;
        if (createdTaskId && itemsToCreate.length > 0) {
          try {
            finalResponse = await taskService.getTaskById(createdTaskId);
          } catch {
            // si falla el refetch, mantenemos el response original
          }
        }

        onTaskCreated(finalResponse.data);

        if (checklistFailedCount > 0 && typeof onWarning === 'function') {
          onWarning(
            `La tarea se creó, pero no se pudieron guardar ${checklistFailedCount} ítem(s) del checklist. Abre la tarea para reintentar.`
          );
        }
      }
      handleClose();
    } catch (err) {
      const data = err.response?.data;
      setError(data?.message || `Error al ${isEditing ? 'actualizar' : 'crear'} la tarea`);
      if (data?.errors && Array.isArray(data.errors)) {
        const mapped = {};
        data.errors.forEach((e) => {
          mapped[e.field] = e.message;
        });
        setFieldErrors(mapped);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      status: 'pending',
      dueDate: '',
      categoryId: '',
      assignedTo: ''
    });
    setError('');
    setFieldErrors({});
    setDraftChecklistItems([]);
    setNewChecklistContent('');
    onHide();
  };

  const handleAddDraftChecklistItem = (e) => {
    e.preventDefault();
    const content = newChecklistContent.trim();
    if (!content) return;
    setDraftChecklistItems((prev) => [...(Array.isArray(prev) ? prev : []), { id: `${Date.now()}-${Math.random()}`, content }]);
    setNewChecklistContent('');
  };

  const handleRemoveDraftChecklistItem = (id) => {
    setDraftChecklistItems((prev) => (Array.isArray(prev) ? prev.filter((i) => i.id !== id) : []));
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="d-flex align-items-center gap-2">
          <div className="task-icon-preview">
            {isEditing ? <FiEdit2 /> : <FiCheckSquare />}
          </div>
          {isEditing ? 'Editar Tarea' : 'Nueva Tarea'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger">
            <strong>{error}</strong>
            {Object.keys(fieldErrors).length > 0 && (
              <ul className="mb-0 mt-1">
                {Object.entries(fieldErrors).map(([field, msg]) => (
                  <li key={field}><strong>{field}:</strong> {msg}</li>
                ))}
              </ul>
            )}
          </Alert>
        )}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Título de la tarea *</Form.Label>
            <Form.Control
              type="text"
              name="title"
              placeholder="¿Qué necesitas hacer?"
              value={formData.title}
              onChange={handleChange}
              required
              minLength={3}
              maxLength={255}
              isInvalid={!!fieldErrors.title}
            />
            <Form.Control.Feedback type="invalid">
              {fieldErrors.title}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Descripción (opcional)</Form.Label>
            <Form.Control
              as="textarea"
              ref={descRef}
              rows={5}
              name="description"
              placeholder="Agrega más detalles sobre la tarea..."
              value={formData.description}
              onChange={(e) => {
                handleChange(e);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              maxLength={1000}
              isInvalid={!!fieldErrors.description}
              style={{
                fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
                fontSize: '0.85rem',
                lineHeight: '1.5',
                resize: 'vertical',
                minHeight: '120px'
              }}
            />
            <div className="d-flex justify-content-between mt-1">
              <Form.Control.Feedback type="invalid" style={{ display: fieldErrors.description ? 'block' : 'none' }}>
                {fieldErrors.description}
              </Form.Control.Feedback>
              <small className="text-muted ms-auto">{formData.description.length}/1000</small>
            </div>
          </Form.Group>

          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Prioridad</Form.Label>
                <div className="priority-selector">
                  {priorities.map((priority) => (
                    <button
                      key={priority.value}
                      type="button"
                      className={`priority-option ${formData.priority === priority.value ? 'selected' : ''}`}
                      style={{
                        '--priority-color': priority.color
                      }}
                      onClick={() => setFormData({ ...formData, priority: priority.value })}
                    >
                      <span
                        className="priority-dot"
                        style={{ backgroundColor: priority.color }}
                      />
                      {priority.label}
                    </button>
                  ))}
                </div>
              </Form.Group>
            </Col>
           
          </Row>
          <Row>
             <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Estado</Form.Label>
                <div className="status-selector">
                  {statuses.map((status) => {
                    const IconComponent = status.icon;
                    return (
                      <button
                        key={status.value}
                        type="button"
                        className={`status-option ${formData.status === status.value ? 'selected' : ''}`}
                        style={{
                          '--status-color': status.color
                        }}
                        onClick={() => setFormData({ ...formData, status: status.value })}
                      >
                        <IconComponent size={14} style={{ color: status.color }} />
                        {status.label}
                      </button>
                    );
                  })}
                </div>
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Fecha de vencimiento</Form.Label>
                <Form.Control
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  isInvalid={!!fieldErrors.dueDate}
                />
                <Form.Control.Feedback type="invalid">
                  {fieldErrors.dueDate}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Categoría</Form.Label>
                <Form.Select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  isInvalid={!!fieldErrors.categoryId}
                >
                  <option value="">Sin categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Form.Select>
                {fieldErrors.categoryId && (
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.categoryId}
                  </Form.Control.Feedback>
                )}
              </Form.Group>
            </Col>
          </Row>

          {workspaceMembers.length > 1 && (
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Asignar a</Form.Label>
                  <Form.Select
                    name="assignedTo"
                    value={formData.assignedTo}
                    onChange={handleChange}
                  >
                    <option value="">Sin asignar</option>
                    {workspaceMembers.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.user?.name || member.user?.email} ({member.role})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          )}

          <div className="d-grid gap-2 mt-4">
            <Button
              variant="primary"
              type="submit"
              disabled={loading}
              className="btn-create-task"
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {isEditing ? 'Guardando...' : 'Creando...'}
                </>
              ) : (
                <>
                  {isEditing ? <FiEdit2 className="me-2" /> : <FiCheckSquare className="me-2" />}
                  {isEditing ? 'Guardar Cambios' : 'Crear Tarea'}
                </>
              )}
            </Button>
          </div>
        </Form>

        {!isEditing && (
          <div className="task-checklist mt-3">
            <div className="checklist-header">
              <span className="checklist-title">Checklist (opcional)</span>
              {draftChecklistItems.length > 0 && (
                <span className="checklist-count">{draftChecklistItems.length}</span>
              )}
            </div>

            {draftChecklistItems.length > 0 && (
              <div className="checklist-items">
                {draftChecklistItems.map((item) => (
                  <div key={item.id} className="checklist-item">
                    <span className="checklist-item-text">{item.content}</span>
                    <button
                      type="button"
                      className="checklist-delete-btn"
                      onClick={() => handleRemoveDraftChecklistItem(item.id)}
                      title="Eliminar"
                    >
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddDraftChecklistItem} className="checklist-add-form">
              <Form.Control
                type="text"
                size="sm"
                placeholder="Agregar ítem..."
                value={newChecklistContent}
                onChange={(e) => setNewChecklistContent(e.target.value)}
                maxLength={500}
                disabled={loading}
              />
              <Button
                type="submit"
                size="sm"
                variant="outline-primary"
                disabled={!newChecklistContent.trim() || loading}
                className="checklist-add-btn"
              >
                <FiPlus size={14} />
              </Button>
            </form>

            <small className="text-muted d-block mt-1">
              Se guardará al crear la tarea.
            </small>
          </div>
        )}

        {isEditing && taskToEdit?.id && (
          <TaskChecklist taskId={taskToEdit.id} />
        )}
      </Modal.Body>
    </Modal>
  );
};

export default TaskForm;
