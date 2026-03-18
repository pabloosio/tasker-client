import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Form, Button, Alert, Spinner, Badge, Pagination } from 'react-bootstrap';
import { FiEdit2, FiUser } from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';
import EditUserModal from '../../components/admin/EditUserModal';
import adminService from '../../services/adminService';

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [filterVerified, setFilterVerified] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Cargar usuarios
  const loadUsers = async (page = 1) => {
    setLoading(true);
    setError('');

    try {
      const filters = {
        page,
        limit: 10,
        email: searchEmail || undefined,
        role: filterRole || undefined,
        isActive: filterActive ? filterActive === 'active' : undefined,
        emailVerified: filterVerified ? filterVerified === 'verified' : undefined
      };

      // Limpiar undefined
      Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

      const response = await adminService.getUsers(filters);
      setUsers(response.data.users);
      setPagination(response.data.pagination);
      setCurrentPage(page);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  // Cargar usuarios al montar y cuando cambian filtros
  useEffect(() => {
    loadUsers(1);
  }, [searchEmail, filterRole, filterActive, filterVerified]);

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleUserUpdated = () => {
    setShowModal(false);
    setSelectedUser(null);
    loadUsers(currentPage);
  };

  const handlePaginationClick = (pageNum) => {
    loadUsers(pageNum);
  };

  // Generar iniciales para avatar
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Renderizar botones de paginación
  const renderPaginationButtons = () => {
    const buttons = [];
    const { pages = 1 } = pagination;

    for (let i = 1; i <= pages; i++) {
      buttons.push(
        <Pagination.Item
          key={i}
          active={i === currentPage}
          onClick={() => handlePaginationClick(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    return buttons;
  };

  return (
    <MainLayout>
      <Container fluid className="py-4">
        <Row className="mb-4">
          <Col>
            <h2 className="mb-2">Panel de Administración</h2>
            <p className="text-muted mb-0">Gestión de usuarios y cuentas</p>
          </Col>
        </Row>

        {error && <Alert variant="danger">{error}</Alert>}

        {/* FILTROS */}
        <Card className="mb-4">
          <Card.Body>
            <h6 className="mb-3">Filtros</h6>
            <Row>
              <Col md={3} className="mb-3">
                <Form.Group>
                  <Form.Label className="small">Buscar por Email</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="usuario@email.com"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                  />
                </Form.Group>
              </Col>

              <Col md={3} className="mb-3">
                <Form.Group>
                  <Form.Label className="small">Rol</Form.Label>
                  <Form.Select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={3} className="mb-3">
                <Form.Group>
                  <Form.Label className="small">Estado</Form.Label>
                  <Form.Select
                    value={filterActive}
                    onChange={(e) => setFilterActive(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={3} className="mb-3">
                <Form.Group>
                  <Form.Label className="small">Email Verificado</Form.Label>
                  <Form.Select
                    value={filterVerified}
                    onChange={(e) => setFilterVerified(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="verified">Verificados</option>
                    <option value="unverified">No Verificados</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* TABLA DE USUARIOS */}
        <Card>
          <Card.Body>
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" className="mb-3" />
                <p className="text-muted">Cargando usuarios...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-5">
                <FiUser className="mb-3" style={{ fontSize: '2.5rem', color: '#ccc' }} />
                <p className="text-muted">No hay usuarios que coincidan con los filtros</p>
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <Table hover>
                    <thead className="table-light">
                      <tr>
                        <th>Usuario</th>
                        <th>Email</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th className="text-center">Verificado</th>
                        <th>Registrado</th>
                        <th className="text-end">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          {/* AVATAR Y NOMBRE */}
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div
                                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  fontSize: '0.85rem',
                                  fontWeight: 'bold'
                                }}
                              >
                                {getInitials(user.name)}
                              </div>
                              <div>
                                <div className="fw-500">{user.name}</div>
                              </div>
                            </div>
                          </td>

                          {/* EMAIL */}
                          <td>
                            <code style={{ fontSize: '0.85em' }}>{user.email}</code>
                          </td>

                          {/* ROL */}
                          <td>
                            <Badge
                              bg={user.role === 'ADMIN' ? 'danger' : 'secondary'}
                            >
                              {user.role}
                            </Badge>
                          </td>

                          {/* ESTADO */}
                          <td>
                            <Badge
                              bg={user.isActive ? 'success' : 'warning'}
                            >
                              {user.isActive ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </td>

                          {/* VERIFICADO */}
                          <td className="text-center">
                            {user.emailVerified ? (
                              <Badge bg="success">✓</Badge>
                            ) : (
                              <Badge bg="danger">✗</Badge>
                            )}
                          </td>

                          {/* FECHA */}
                          <td className="small text-muted">
                            {new Date(user.createdAt).toLocaleDateString('es-ES')}
                          </td>

                          {/* ACCIONES */}
                          <td className="text-end">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            >
                              <FiEdit2 className="me-1" /> Editar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                {/* PAGINACIÓN */}
                {pagination.pages > 1 && (
                  <div className="d-flex justify-content-center mt-4">
                    <Pagination>
                      <Pagination.Prev
                        onClick={() => handlePaginationClick(currentPage - 1)}
                        disabled={currentPage === 1}
                      />
                      {renderPaginationButtons()}
                      <Pagination.Next
                        onClick={() => handlePaginationClick(currentPage + 1)}
                        disabled={currentPage === pagination.pages}
                      />
                    </Pagination>
                  </div>
                )}

                {/* INFO DE PAGINACIÓN */}
                <div className="text-center text-muted small mt-3">
                  Mostrando {users.length} de {pagination.total} usuarios
                </div>
              </>
            )}
          </Card.Body>
        </Card>
      </Container>

      {/* MODAL DE EDICIÓN */}
      <EditUserModal
        show={showModal}
        user={selectedUser}
        onHide={() => setShowModal(false)}
        onSuccess={handleUserUpdated}
      />
    </MainLayout>
  );
};

export default AdminUsersPage;
