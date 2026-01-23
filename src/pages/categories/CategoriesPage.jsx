import { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner, Alert, Button } from 'react-bootstrap';
import { FiPlus, FiFolder, FiEdit2, FiTrash2 } from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';
import CategoryForm from '../../components/categories/CategoryForm';
import ConfirmModal from '../../components/common/ConfirmModal';
import categoryService from '../../services/categoryService';

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoryService.getCategories();
      const data = response.data || response;
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryCreated = (newCategory) => {
    const categoryData = newCategory.data || newCategory;
    setCategories(prev => [...(Array.isArray(prev) ? prev : []), categoryData]);
    setShowModal(false);
  };

  const handleCategoryUpdated = (updatedCategory) => {
    const categoryData = updatedCategory.data || updatedCategory;
    setCategories(prev => (Array.isArray(prev) ? prev : []).map(cat =>
      cat.id === categoryData.id ? categoryData : cat
    ));
    setCategoryToEdit(null);
    setShowModal(false);
  };

  const handleEditCategory = (category) => {
    setCategoryToEdit(category);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    setDeleting(true);
    try {
      await categoryService.deleteCategory(categoryToDelete.id);
      setCategories(prev => (Array.isArray(prev) ? prev : []).filter(cat => cat.id !== categoryToDelete.id));
      setCategoryToDelete(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar la categoría');
    } finally {
      setDeleting(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCategoryToEdit(null);
  };

  // Obtener lista segura de categorías
  const categoryList = Array.isArray(categories) ? categories : [];

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Cargando categorías...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Categorías</h2>
          <p className="text-muted mb-0">Organiza tus tareas por categorías</p>
        </div>
        <Button
          className="btn-add-category"
          onClick={() => setShowModal(true)}
        >
          <FiPlus className="me-2" />
          Nueva Categoría
        </Button>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {categoryList.length === 0 ? (
        <Card className="shadow-sm border-0">
          <Card.Body className="text-center py-5">
            <div className="empty-state-icon mb-3">
              <FiFolder />
            </div>
            <h5 className="text-muted mb-2">No tienes categorías todavía</h5>
            <p className="text-muted mb-4">
              Crea tu primera categoría para organizar mejor tus tareas
            </p>
            <Button
              className="btn-add-category"
              onClick={() => setShowModal(true)}
            >
              <FiPlus className="me-2" />
              Crear mi primera categoría
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Row>
          {categoryList.map((category) => (
            <Col key={category.id} md={6} lg={4} className="mb-4">
              <Card className="category-card shadow-sm h-100">
                <Card.Body>
                  <div className="d-flex align-items-start">
                    <div
                      className="category-color-indicator"
                      style={{ backgroundColor: category.color || '#3B82F6' }}
                    >
                      <FiFolder />
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h5 className="mb-1">{category.name}</h5>
                      {category.description && (
                        <p className="text-muted small mb-0">
                          {category.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Card.Body>
                <Card.Footer className="bg-transparent border-0 pt-0">
                  <div className="d-flex justify-content-end gap-2">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="btn-category-action"
                      onClick={() => handleEditCategory(category)}
                    >
                      <FiEdit2 />
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="btn-category-action"
                      onClick={() => setCategoryToDelete(category)}
                    >
                      <FiTrash2 />
                    </Button>
                  </div>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <CategoryForm
        show={showModal}
        onHide={handleCloseModal}
        onCategoryCreated={handleCategoryCreated}
        onCategoryUpdated={handleCategoryUpdated}
        categoryToEdit={categoryToEdit}
      />

      <ConfirmModal
        show={!!categoryToDelete}
        onHide={() => setCategoryToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar categoría"
        message={`¿Estás seguro de eliminar la categoría "${categoryToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
        loading={deleting}
      />
    </MainLayout>
  );
};

export default CategoriesPage;
