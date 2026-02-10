import { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FiFolder, FiEdit2 } from 'react-icons/fi';
import categoryService from '../../services/categoryService';

const CategoryForm = ({ show, onHide, onCategoryCreated, onCategoryUpdated, categoryToEdit, workspaceId }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isEditing = !!categoryToEdit;

  const predefinedColors = [
    '#3B82F6', // Azul
    '#10B981', // Verde
    '#F59E0B', // Amarillo
    '#EF4444', // Rojo
    '#8B5CF6', // Púrpura
    '#EC4899', // Rosa
    '#06B6D4', // Cyan
    '#F97316', // Naranja
  ];

  useEffect(() => {
    if (categoryToEdit) {
      setFormData({
        name: categoryToEdit.name || '',
        description: categoryToEdit.description || '',
        color: categoryToEdit.color || '#3B82F6'
      });
    } else {
      setFormData({ name: '', description: '', color: '#3B82F6' });
    }
  }, [categoryToEdit, show]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleColorSelect = (color) => {
    setFormData({
      ...formData,
      color
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEditing) {
        const response = await categoryService.updateCategory(categoryToEdit.id, formData);
        onCategoryUpdated(response.data);
      } else {
        const dataToSend = { ...formData };
        if (workspaceId) dataToSend.workspaceId = workspaceId;
        const response = await categoryService.createCategory(dataToSend);
        onCategoryCreated(response.data);
      }
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || `Error al ${isEditing ? 'actualizar' : 'crear'} la categoría`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', description: '', color: '#3B82F6' });
    setError('');
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="d-flex align-items-center gap-2">
          <div
            className="category-icon-preview"
            style={{ backgroundColor: formData.color }}
          >
            {isEditing ? <FiEdit2 /> : <FiFolder />}
          </div>
          {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Nombre de la categoría</Form.Label>
            <Form.Control
              type="text"
              name="name"
              placeholder="Ej: Trabajo, Personal, Estudios..."
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
              rows={2}
              name="description"
              placeholder="Describe para qué usarás esta categoría..."
              value={formData.description}
              onChange={handleChange}
              maxLength={255}
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Color</Form.Label>
            <div className="color-picker-container">
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-option ${formData.color === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                  aria-label={`Seleccionar color ${color}`}
                />
              ))}
            </div>
          </Form.Group>

          <div className="d-grid gap-2">
            <Button
              variant="primary"
              type="submit"
              disabled={loading}
              className="btn-create-category"
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {isEditing ? 'Guardando...' : 'Creando...'}
                </>
              ) : (
                <>
                  {isEditing ? <FiEdit2 className="me-2" /> : <FiFolder className="me-2" />}
                  {isEditing ? 'Guardar Cambios' : 'Crear Categoría'}
                </>
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default CategoryForm;
