import { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { FiCheckSquare, FiEdit2, FiClock, FiLoader, FiCheckCircle } from 'react-icons/fi';
import taskService from '../../services/taskService';

const TaskForm = ({ show, onHide, onTaskCreated, onTaskUpdated, taskToEdit, categories = [], workspaceId, workspaceMembers = [] }) => {
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
  const [loading, setLoading] = useState(false);

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
  }, [taskToEdit, show]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
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
        onTaskCreated(response.data);
      }
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || `Error al ${isEditing ? 'actualizar' : 'crear'} la tarea`);
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
    onHide();
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
        {error && <Alert variant="danger">{error}</Alert>}
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
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Descripción (opcional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              placeholder="Agrega más detalles sobre la tarea..."
              value={formData.description}
              onChange={handleChange}
              maxLength={1000}
            />
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
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Categoría</Form.Label>
                <Form.Select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                >
                  <option value="">Sin categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Form.Select>
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
      </Modal.Body>
    </Modal>
  );
};

export default TaskForm;
