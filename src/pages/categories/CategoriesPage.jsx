import { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner, Alert, Button, Badge, Form, ListGroup } from 'react-bootstrap';
import { FiPlus, FiFolder, FiEdit2, FiTrash2, FiLock, FiCheckCircle } from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';
import CategoryForm from '../../components/categories/CategoryForm';
import ConfirmModal from '../../components/common/ConfirmModal';
import categoryService from '../../services/categoryService';
import { useWorkspace } from '../../context/WorkspaceContext';

const ROLE_LABELS = {
  OWNER: { label: 'Propietario', variant: 'primary' },
  ADMIN: { label: 'Administrador', variant: 'warning' },
  MEMBER: { label: 'Miembro', variant: 'secondary' },
  VIEWER: { label: 'Observador', variant: 'info' }
};

// Mismo criterio que la API: solo OWNER/ADMIN gestionan las categorías de un tablero
const canManageCategories = (workspace) => ['OWNER', 'ADMIN'].includes(workspace?.myRole);

const CategoriesPage = () => {
  const { currentWorkspace, workspaces } = useWorkspace();
  const [selectedId, setSelectedId] = useState(currentWorkspace?.id || null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Si cambian de tablero desde el selector del navbar, seguirlo
  useEffect(() => {
    if (currentWorkspace?.id) setSelectedId(currentWorkspace.id);
  }, [currentWorkspace?.id]);

  const workspaceList = Array.isArray(workspaces) ? workspaces : [];
  const selected = workspaceList.find(w => w.id === selectedId) || null;
  const canManage = canManageCategories(selected);

  useEffect(() => {
    if (selectedId) fetchCategories(selectedId);
  }, [selectedId]);

  const fetchCategories = async (workspaceId) => {
    setLoading(true);
    setError('');
    try {
      const response = await categoryService.getCategories({ workspaceId });
      const data = response.data || response;
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      setCategories([]);
      setError(err.response?.data?.message || 'Error al cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryCreated = (newCategory) => {
    const categoryData = newCategory.data || newCategory;
    setCategories(prev => [...prev, { ...categoryData, taskCount: 0 }]);
    setShowModal(false);
  };

  const handleCategoryUpdated = (updatedCategory) => {
    const categoryData = updatedCategory.data || updatedCategory;
    setCategories(prev => prev.map(cat =>
      cat.id === categoryData.id ? { ...categoryData, taskCount: cat.taskCount } : cat
    ));
    setCategoryToEdit(null);
    setShowModal(false);
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    setDeleting(true);
    try {
      await categoryService.deleteCategory(categoryToDelete.id);
      setCategories(prev => prev.filter(cat => cat.id !== categoryToDelete.id));
      setCategoryToDelete(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar la categoría');
      setCategoryToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCategoryToEdit(null);
  };

  const deleteMessage = (() => {
    if (!categoryToDelete) return '';
    const count = categoryToDelete.taskCount || 0;
    const tasksNote = count > 0
      ? ` ${count} ${count === 1 ? 'tarea quedará' : 'tareas quedarán'} sin categoría.`
      : '';
    return `¿Eliminar la categoría "${categoryToDelete.name}" del tablero ${selected?.name}?${tasksNote} Esta acción no se puede deshacer.`;
  })();

  const RoleBadge = ({ role }) => {
    const config = ROLE_LABELS[role];
    if (!config) return null;
    return <Badge bg={config.variant} className="fw-normal">{config.label}</Badge>;
  };

  return (
    <MainLayout>
      <div className="mb-4">
        <h2 className="mb-1">Categorías</h2>
        <p className="text-muted mb-0">
          Cada tablero tiene sus propias categorías. Solo el propietario y los administradores pueden gestionarlas.
        </p>
      </div>

      <Row>
        {/* Selector de tablero: lista en escritorio, select en móvil */}
        <Col lg={3} className="mb-4">
          <Form.Select
            className="d-lg-none"
            value={selectedId || ''}
            onChange={(e) => setSelectedId(e.target.value)}
            aria-label="Tablero"
          >
            {workspaceList.map(ws => (
              <option key={ws.id} value={ws.id}>
                {ws.name} · {ROLE_LABELS[ws.myRole]?.label}
              </option>
            ))}
          </Form.Select>

          <Card className="shadow-sm d-none d-lg-block">
            <Card.Header className="bg-transparent small text-muted fw-semibold text-uppercase">
              Mis tableros
            </Card.Header>
            <ListGroup variant="flush">
              {workspaceList.map(ws => (
                <ListGroup.Item
                  key={ws.id}
                  action
                  active={ws.id === selectedId}
                  onClick={() => setSelectedId(ws.id)}
                  className="d-flex justify-content-between align-items-center gap-2"
                >
                  <span className="text-truncate">{ws.name}</span>
                  {!canManageCategories(ws) && (
                    <FiLock size={13} className="flex-shrink-0 opacity-50" title="Solo lectura" />
                  )}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
        </Col>

        <Col lg={9}>
          {selected && (
            <Card className="shadow-sm mb-4">
              <Card.Body className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <h4 className="mb-0">{selected.name}</h4>
                    <RoleBadge role={selected.myRole} />
                  </div>
                  <small className={canManage ? 'text-success' : 'text-muted'}>
                    {canManage ? (
                      <><FiCheckCircle className="me-1" />Puedes crear, editar y eliminar categorías en este tablero</>
                    ) : (
                      <><FiLock className="me-1" />Solo lectura: pide a un propietario o administrador del tablero que haga los cambios</>
                    )}
                  </small>
                </div>
                {canManage && (
                  <Button className="btn-add-category" onClick={() => setShowModal(true)}>
                    <FiPlus className="me-2" />
                    Nueva Categoría
                  </Button>
                )}
              </Card.Body>
            </Card>
          )}

          {error && (
            <Alert variant="danger" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Cargando categorías...</p>
            </div>
          ) : categories.length === 0 ? (
            <Card className="shadow-sm border-0">
              <Card.Body className="text-center py-5">
                <div className="empty-state-icon mb-3">
                  <FiFolder />
                </div>
                <h5 className="text-muted mb-2">Este tablero no tiene categorías</h5>
                {canManage ? (
                  <>
                    <p className="text-muted mb-4">Crea la primera para organizar las tareas del tablero</p>
                    <Button className="btn-add-category" onClick={() => setShowModal(true)}>
                      <FiPlus className="me-2" />
                      Crear la primera categoría
                    </Button>
                  </>
                ) : (
                  <p className="text-muted mb-0">Un propietario o administrador del tablero puede crearlas</p>
                )}
              </Card.Body>
            </Card>
          ) : (
            <Row>
              {categories.map((category) => (
                <Col key={category.id} md={6} xl={4} className="mb-4">
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
                    <Card.Footer className="bg-transparent border-0 pt-0 d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        {category.taskCount || 0} {category.taskCount === 1 ? 'tarea' : 'tareas'}
                      </small>
                      {canManage && (
                        <div className="d-flex gap-2">
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="btn-category-action"
                            onClick={() => { setCategoryToEdit(category); setShowModal(true); }}
                            title="Editar"
                          >
                            <FiEdit2 />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="btn-category-action"
                            onClick={() => setCategoryToDelete(category)}
                            title="Eliminar"
                          >
                            <FiTrash2 />
                          </Button>
                        </div>
                      )}
                    </Card.Footer>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Col>
      </Row>

      <CategoryForm
        show={showModal}
        onHide={handleCloseModal}
        onCategoryCreated={handleCategoryCreated}
        onCategoryUpdated={handleCategoryUpdated}
        categoryToEdit={categoryToEdit}
        workspaceId={selectedId}
      />

      <ConfirmModal
        show={!!categoryToDelete}
        onHide={() => setCategoryToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar categoría"
        message={deleteMessage}
        confirmText="Eliminar"
        variant="danger"
        loading={deleting}
      />
    </MainLayout>
  );
};

export default CategoriesPage;
