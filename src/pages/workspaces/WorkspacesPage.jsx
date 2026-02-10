import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Spinner, Alert, Button, Badge } from 'react-bootstrap';
import { FiPlus, FiBriefcase, FiEdit2, FiTrash2, FiUsers, FiUser, FiSettings } from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';
import WorkspaceForm from '../../components/workspaces/WorkspaceForm';
import ConfirmModal from '../../components/common/ConfirmModal';
import workspaceService from '../../services/workspaceService';
import { useWorkspace } from '../../context/WorkspaceContext';

const WorkspacesPage = () => {
  const { workspaces, loading, refreshWorkspaces } = useWorkspace();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [workspaceToEdit, setWorkspaceToEdit] = useState(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreated = async () => {
    await refreshWorkspaces();
    setShowModal(false);
  };

  const handleUpdated = async () => {
    await refreshWorkspaces();
    setWorkspaceToEdit(null);
    setShowModal(false);
  };

  const handleEdit = (workspace) => {
    setWorkspaceToEdit(workspace);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!workspaceToDelete) return;
    setDeleting(true);
    try {
      await workspaceService.deleteWorkspace(workspaceToDelete.id);
      await refreshWorkspaces();
      setWorkspaceToDelete(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar el tablero');
    } finally {
      setDeleting(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setWorkspaceToEdit(null);
  };

  const workspaceList = Array.isArray(workspaces) ? workspaces : [];

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Cargando tableros...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Tableros</h2>
          <p className="text-muted mb-0">Gestiona tus espacios de trabajo</p>
        </div>
        <Button className="btn-add-category" onClick={() => setShowModal(true)}>
          <FiPlus className="me-2" />
          Nuevo Tablero
        </Button>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Row>
        {workspaceList.map((workspace) => (
          <Col key={workspace.id} md={6} lg={4} className="mb-4">
            <Card className="category-card shadow-sm h-100" style={{ cursor: 'pointer' }}>
              <Card.Body onClick={() => navigate(`/workspaces/${workspace.id}`)}>
                <div className="d-flex align-items-start">
                  <div
                    className="category-color-indicator"
                    style={{ backgroundColor: workspace.isPersonal ? '#6366f1' : '#3B82F6' }}
                  >
                    {workspace.isPersonal ? <FiUser /> : <FiUsers />}
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <h5 className="mb-0">{workspace.name}</h5>
                      {workspace.isPersonal && (
                        <Badge bg="secondary" className="small">Personal</Badge>
                      )}
                    </div>
                    {workspace.description && (
                      <p className="text-muted small mb-0">{workspace.description}</p>
                    )}
                  </div>
                </div>
              </Card.Body>
              {!workspace.isPersonal && (
                <Card.Footer className="bg-transparent border-0 pt-0">
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted">
                      <FiUsers className="me-1" />
                      {workspace.memberCount || workspace.members?.length || '—'} miembros
                    </small>
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="btn-category-action"
                        onClick={(e) => { e.stopPropagation(); navigate(`/workspaces/${workspace.id}`); }}
                      >
                        <FiSettings />
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="btn-category-action"
                        onClick={(e) => { e.stopPropagation(); handleEdit(workspace); }}
                      >
                        <FiEdit2 />
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        className="btn-category-action"
                        onClick={(e) => { e.stopPropagation(); setWorkspaceToDelete(workspace); }}
                      >
                        <FiTrash2 />
                      </Button>
                    </div>
                  </div>
                </Card.Footer>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      <WorkspaceForm
        show={showModal}
        onHide={handleCloseModal}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
        workspaceToEdit={workspaceToEdit}
      />

      <ConfirmModal
        show={!!workspaceToDelete}
        onHide={() => setWorkspaceToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar tablero"
        message={`¿Estás seguro de eliminar "${workspaceToDelete?.name}"? Se eliminarán todas las tareas y categorías asociadas.`}
        confirmText="Eliminar"
        variant="danger"
        loading={deleting}
      />
    </MainLayout>
  );
};

export default WorkspacesPage;
