import { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FiBriefcase, FiEdit2 } from 'react-icons/fi';
import workspaceService from '../../services/workspaceService';

const WorkspaceForm = ({ show, onHide, onCreated, onUpdated, workspaceToEdit }) => {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isEditing = !!workspaceToEdit;

  useEffect(() => {
    if (workspaceToEdit) {
      setFormData({
        name: workspaceToEdit.name || '',
        description: workspaceToEdit.description || ''
      });
    } else {
      setFormData({ name: '', description: '' });
    }
  }, [workspaceToEdit, show]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEditing) {
        const response = await workspaceService.updateWorkspace(workspaceToEdit.id, formData);
        onUpdated(response.data || response);
      } else {
        const response = await workspaceService.createWorkspace(formData);
        onCreated(response.data || response);
      }
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || `Error al ${isEditing ? 'actualizar' : 'crear'} el tablero`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', description: '' });
    setError('');
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="d-flex align-items-center gap-2">
          <div className="task-icon-preview">
            {isEditing ? <FiEdit2 /> : <FiBriefcase />}
          </div>
          {isEditing ? 'Editar Tablero' : 'Nuevo Tablero'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Nombre *</Form.Label>
            <Form.Control
              type="text"
              name="name"
              placeholder="Nombre del tablero"
              value={formData.name}
              onChange={handleChange}
              required
              minLength={2}
              maxLength={100}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Descripción (opcional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              placeholder="Describe el propósito de este tablero..."
              value={formData.description}
              onChange={handleChange}
              maxLength={500}
            />
          </Form.Group>

          <div className="d-grid gap-2 mt-4">
            <Button variant="primary" type="submit" disabled={loading} className="btn-create-task">
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {isEditing ? 'Guardando...' : 'Creando...'}
                </>
              ) : (
                <>
                  {isEditing ? <FiEdit2 className="me-2" /> : <FiBriefcase className="me-2" />}
                  {isEditing ? 'Guardar Cambios' : 'Crear Tablero'}
                </>
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default WorkspaceForm;
