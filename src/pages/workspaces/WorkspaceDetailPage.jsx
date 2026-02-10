import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Card, Spinner, Alert, Button, Badge, Form, Table } from 'react-bootstrap';
import { FiArrowLeft, FiUsers, FiUserPlus, FiTrash2, FiEdit2, FiShield, FiUser } from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';
import WorkspaceForm from '../../components/workspaces/WorkspaceForm';
import ConfirmModal from '../../components/common/ConfirmModal';
import workspaceService from '../../services/workspaceService';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';

const ROLE_LABELS = {
  OWNER: { label: 'Propietario', variant: 'primary' },
  ADMIN: { label: 'Administrador', variant: 'warning' },
  MEMBER: { label: 'Miembro', variant: 'secondary' }
};

const WorkspaceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshWorkspaces } = useWorkspace();

  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Invite form
  const [availableUsers, setAvailableUsers] = useState([]);
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  // Edit / delete
  const [showEditModal, setShowEditModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [wsRes, membersRes, usersRes] = await Promise.all([
        workspaceService.getWorkspaceById(id),
        workspaceService.getMembers(id),
        workspaceService.getActiveUsers()
      ]);
      setWorkspace(wsRes.data || wsRes);
      const membersList = Array.isArray(membersRes.data || membersRes) ? (membersRes.data || membersRes) : [];
      setMembers(membersList);

      // Filtrar usuarios que ya son miembros
      const memberUserIds = membersList.map(m => m.userId);
      const allUsers = Array.isArray(usersRes.data || usersRes) ? (usersRes.data || usersRes) : [];
      setAvailableUsers(allUsers.filter(u => !memberUserIds.includes(u.id)));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar el tablero');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentUserMember = members.find(m => m.userId === user?.id);
  const isOwnerOrAdmin = currentUserMember && ['OWNER', 'ADMIN'].includes(currentUserMember.role);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    setInviting(true);

    try {
      const selectedUser = availableUsers.find(u => u.id === inviteUserId);
      await workspaceService.inviteMember(id, inviteUserId, inviteRole);
      setInviteSuccess(`Se invitó a ${selectedUser?.name || selectedUser?.email} exitosamente`);
      setInviteUserId('');
      setInviteRole('MEMBER');
      await fetchData();
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Error al invitar al miembro');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setRemoving(true);
    try {
      await workspaceService.removeMember(id, memberToRemove.id);
      setMemberToRemove(null);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al remover al miembro');
    } finally {
      setRemoving(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await workspaceService.updateMemberRole(id, memberId, newRole);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cambiar el rol');
    }
  };

  const handleUpdated = async () => {
    await fetchData();
    await refreshWorkspaces();
    setShowEditModal(false);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Cargando tablero...</p>
        </div>
      </MainLayout>
    );
  }

  if (!workspace) {
    return (
      <MainLayout>
        <Alert variant="danger">No se encontró el tablero</Alert>
        <Button variant="outline-primary" onClick={() => navigate('/workspaces')}>
          <FiArrowLeft className="me-2" /> Volver
        </Button>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <Button variant="outline-secondary" size="sm" onClick={() => navigate('/workspaces')}>
            <FiArrowLeft />
          </Button>
          <div>
            <h2 className="mb-0">{workspace.name}</h2>
            {workspace.description && <p className="text-muted mb-0 small">{workspace.description}</p>}
          </div>
        </div>
        {isOwnerOrAdmin && !workspace.isPersonal && (
          <Button variant="outline-primary" size="sm" onClick={() => setShowEditModal(true)}>
            <FiEdit2 className="me-1" /> Editar
          </Button>
        )}
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <Row>
        {/* Members list */}
        <Col lg={8}>
          <Card className="shadow-sm border-0 mb-4">
            <Card.Header className="bg-transparent border-0 pt-3 pb-0">
              <h5 className="mb-0 d-flex align-items-center gap-2">
                <FiUsers /> Miembros ({members.length})
              </h5>
            </Card.Header>
            <Card.Body>
              <Table responsive hover className="mb-0">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    {isOwnerOrAdmin && <th className="text-end">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const roleInfo = ROLE_LABELS[member.role] || ROLE_LABELS.MEMBER;
                    const isSelf = member.userId === user?.id;
                    const isOwner = member.role === 'OWNER';

                    return (
                      <tr key={member.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div
                              style={{
                                width: 32, height: 32, borderRadius: '50%',
                                backgroundColor: '#e0e7ff', color: '#4338ca',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 600, fontSize: '0.85rem'
                              }}
                            >
                              {member.user?.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="fw-medium">
                                {member.user?.name || 'Sin nombre'}
                                {isSelf && <span className="text-muted ms-1">(tú)</span>}
                              </div>
                              <small className="text-muted">{member.user?.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          {isOwnerOrAdmin && !isOwner && !isSelf ? (
                            <Form.Select
                              size="sm"
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.id, e.target.value)}
                              style={{ width: 'auto' }}
                            >
                              <option value="ADMIN">Administrador</option>
                              <option value="MEMBER">Miembro</option>
                            </Form.Select>
                          ) : (
                            <Badge bg={roleInfo.variant}>{roleInfo.label}</Badge>
                          )}
                        </td>
                        {isOwnerOrAdmin && (
                          <td className="text-end">
                            {!isOwner && !isSelf && (
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => setMemberToRemove(member)}
                              >
                                <FiTrash2 />
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        {/* Invite panel */}
        {isOwnerOrAdmin && !workspace.isPersonal && (
          <Col lg={4}>
            <Card className="shadow-sm border-0 mb-4">
              <Card.Header className="bg-transparent border-0 pt-3 pb-0">
                <h5 className="mb-0 d-flex align-items-center gap-2">
                  <FiUserPlus /> Invitar miembro
                </h5>
              </Card.Header>
              <Card.Body>
                {inviteError && <Alert variant="danger" className="py-2 small">{inviteError}</Alert>}
                {inviteSuccess && <Alert variant="success" className="py-2 small">{inviteSuccess}</Alert>}
                <Form onSubmit={handleInvite}>
                  <Form.Group className="mb-3">
                    <Form.Label className="small">Seleccionar usuario</Form.Label>
                    {availableUsers.length > 0 ? (
                      <Form.Select
                        size="sm"
                        value={inviteUserId}
                        onChange={(e) => setInviteUserId(e.target.value)}
                        required
                      >
                        <option value="">-- Selecciona un usuario --</option>
                        {availableUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email})
                          </option>
                        ))}
                      </Form.Select>
                    ) : (
                      <p className="text-muted small mb-0">No hay usuarios disponibles para invitar</p>
                    )}
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="small">Rol</Form.Label>
                    <Form.Select
                      size="sm"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                    >
                      <option value="MEMBER">Miembro</option>
                      <option value="ADMIN">Administrador</option>
                    </Form.Select>
                  </Form.Group>
                  <Button type="submit" variant="primary" size="sm" className="w-100" disabled={inviting || !inviteUserId}>
                    {inviting ? (
                      <><Spinner animation="border" size="sm" className="me-2" /> Invitando...</>
                    ) : (
                      <><FiUserPlus className="me-1" /> Invitar</>
                    )}
                  </Button>
                </Form>
              </Card.Body>
            </Card>

            <Card className="shadow-sm border-0">
              <Card.Body className="py-3">
                <h6 className="mb-2 d-flex align-items-center gap-2"><FiShield /> Permisos</h6>
                <ul className="small text-muted mb-0 ps-3">
                  <li><strong>Propietario:</strong> Control total</li>
                  <li><strong>Admin:</strong> Gestionar miembros y tareas</li>
                  <li><strong>Miembro:</strong> Crear y editar tareas</li>
                </ul>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

      <WorkspaceForm
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        onUpdated={handleUpdated}
        workspaceToEdit={workspace}
      />

      <ConfirmModal
        show={!!memberToRemove}
        onHide={() => setMemberToRemove(null)}
        onConfirm={handleRemoveMember}
        title="Remover miembro"
        message={`¿Estás seguro de remover a "${memberToRemove?.user?.name || memberToRemove?.user?.email}" de este tablero?`}
        confirmText="Remover"
        variant="danger"
        loading={removing}
      />
    </MainLayout>
  );
};

export default WorkspaceDetailPage;
