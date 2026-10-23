import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Row, Col, Card, Spinner, Alert, Badge, Form, Button, Table } from 'react-bootstrap';
import { FiMail, FiShield, FiCalendar, FiClock, FiCheckSquare, FiAlertCircle, FiCheckCircle, FiStar, FiArrowRight, FiUsers } from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';
import profileService from '../../services/profileService';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatDate, humanizeDate } from '../../utils/dateUtils';

const ROLE_LABELS = {
  OWNER: { label: 'Propietario', variant: 'primary' },
  ADMIN: { label: 'Administrador', variant: 'warning' },
  MEMBER: { label: 'Miembro', variant: 'secondary' },
  VIEWER: { label: 'Observador', variant: 'info' }
};

// Qué permite cada rol (mismo criterio que la API)
const ROLE_CAN = {
  OWNER: 'Control total: tareas, categorías, miembros y configuración',
  ADMIN: 'Gestiona todas las tareas, categorías y miembros',
  MEMBER: 'Crea tareas; mueve las asignadas a ti o creadas por ti',
  VIEWER: 'Solo lectura'
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { workspaces, switchWorkspace, pinWorkspace } = useWorkspace();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState(null);

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await profileService.getSummary();
        setSummary(response.data);
        setName(response.data.user.name);
      } catch (err) {
        setError(err.response?.data?.message || 'Error al cargar tu perfil');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSaveName = async (e) => {
    e.preventDefault();
    setNameMsg(null);
    setSavingName(true);
    try {
      await profileService.updateProfile({ name: name.trim() });
      updateUser({ name: name.trim() });
      setSummary(prev => ({ ...prev, user: { ...prev.user, name: name.trim() } }));
      setNameMsg({ variant: 'success', text: 'Nombre actualizado' });
    } catch (err) {
      setNameMsg({ variant: 'danger', text: err.response?.data?.errors?.[0]?.message || err.response?.data?.message || 'No se pudo guardar' });
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (passwords.next.length < 8) {
      setPasswordMsg({ variant: 'danger', text: 'La nueva contraseña debe tener al menos 8 caracteres' });
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordMsg({ variant: 'danger', text: 'Las contraseñas nuevas no coinciden' });
      return;
    }
    setSavingPassword(true);
    try {
      await profileService.changePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '', confirm: '' });
      setPasswordMsg({ variant: 'success', text: 'Contraseña actualizada' });
    } catch (err) {
      setPasswordMsg({ variant: 'danger', text: err.response?.data?.errors?.[0]?.message || err.response?.data?.message || 'No se pudo cambiar la contraseña' });
    } finally {
      setSavingPassword(false);
    }
  };

  const openBoard = (workspaceId) => {
    const workspace = (workspaces || []).find(w => w.id === workspaceId);
    if (workspace) switchWorkspace(workspace);
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Cargando perfil...</p>
        </div>
      </MainLayout>
    );
  }

  if (!summary) {
    return (
      <MainLayout>
        <Alert variant="danger">{error || 'No se pudo cargar tu perfil'}</Alert>
      </MainLayout>
    );
  }

  const { user: profile, stats } = summary;
  // Tableros compartidos primero; el personal al final
  const boards = [...summary.workspaces].sort((a, b) => Number(a.isPersonal) - Number(b.isPersonal));
  const isPlatformAdmin = profile.role === 'ADMIN';

  return (
    <MainLayout>
      {/* Encabezado */}
      <Card className="shadow-sm mb-4">
        <Card.Body className="d-flex flex-wrap align-items-center gap-4">
          <div className="profile-avatar">{profile.name?.charAt(0)?.toUpperCase()}</div>
          <div className="flex-grow-1">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
              <h3 className="mb-0">{profile.name}</h3>
              {isPlatformAdmin && <Badge bg="danger"><FiShield className="me-1" />Administrador de la plataforma</Badge>}
            </div>
            <div className="profile-meta">
              <span><FiMail className="me-1" />{profile.email}</span>
              <span><FiCalendar className="me-1" />Miembro desde {formatDate(profile.createdAt)}</span>
              {profile.lastLogin && <span><FiClock className="me-1" />Último acceso {humanizeDate(profile.lastLogin)}</span>}
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Números */}
      <Row className="mb-4 g-3">
        <Col sm={4}>
          <Link to="/mis-tareas" className="profile-stat">
            <FiCheckSquare className="profile-stat-icon" style={{ color: '#0d6efd' }} />
            <div><strong>{stats.openTasks}</strong><span>Tareas abiertas asignadas</span></div>
          </Link>
        </Col>
        <Col sm={4}>
          <Link to="/mis-tareas" className="profile-stat">
            <FiAlertCircle className="profile-stat-icon" style={{ color: '#dc3545' }} />
            <div><strong className={stats.overdue > 0 ? 'text-danger' : ''}>{stats.overdue}</strong><span>Vencidas</span></div>
          </Link>
        </Col>
        <Col sm={4}>
          <div className="profile-stat">
            <FiCheckCircle className="profile-stat-icon" style={{ color: '#198754' }} />
            <div><strong>{stats.completedThisMonth}</strong><span>Completadas este mes</span></div>
          </div>
        </Col>
      </Row>

      {/* Tableros y permisos */}
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-transparent d-flex justify-content-between align-items-center">
          <strong>Mis tableros y permisos</strong>
          <small className="text-muted">{boards.length} tableros</small>
        </Card.Header>
        <Table responsive hover className="mb-0 align-middle profile-boards">
          <thead>
            <tr>
              <th>Tablero</th>
              <th>Mi rol</th>
              <th className="d-none d-lg-table-cell">Qué puedo hacer</th>
              <th className="text-center d-none d-md-table-cell"><FiUsers title="Miembros" /></th>
              <th className="text-center">Mis abiertas</th>
              <th className="text-end"></th>
            </tr>
          </thead>
          <tbody>
            {boards.map(board => {
              const role = ROLE_LABELS[board.myRole];
              const isPinned = user?.pinnedWorkspaceId === board.id;
              return (
                <tr key={board.id}>
                  <td>
                    <div className="fw-semibold">{board.name}</div>
                    <small className="text-muted">
                      {board.isPersonal ? 'Espacio privado' : `Propietario: ${board.owner?.name || '—'} · desde ${formatDate(board.joinedAt)}`}
                    </small>
                  </td>
                  <td><Badge bg={role?.variant} className="fw-normal">{role?.label}</Badge></td>
                  <td className="d-none d-lg-table-cell small text-muted">
                    {board.isPersonal ? 'Tu espacio: control total' : ROLE_CAN[board.myRole]}
                  </td>
                  <td className="text-center d-none d-md-table-cell">{board.memberCount}</td>
                  <td className="text-center">{board.myOpenTasks}</td>
                  <td className="text-end text-nowrap">
                    <button
                      type="button"
                      className={`profile-pin ${isPinned ? 'active' : ''}`}
                      onClick={() => pinWorkspace(board.id)}
                      title={isPinned ? 'Tablero predeterminado (clic para quitar)' : 'Abrir este tablero al iniciar sesión'}
                    >
                      <FiStar />
                    </button>
                    <Button variant="outline-primary" size="sm" onClick={() => openBoard(board.id)}>
                      Abrir <FiArrowRight />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      {/* Cuenta */}
      <Row className="g-4">
        <Col lg={6}>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-transparent"><strong>Datos de la cuenta</strong></Card.Header>
            <Card.Body>
              <Form onSubmit={handleSaveName}>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre</Form.Label>
                  <Form.Control value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Correo electrónico</Form.Label>
                  <Form.Control value={profile.email} disabled />
                  <Form.Text>Para cambiarlo, contacta a un administrador de la plataforma.</Form.Text>
                </Form.Group>
                {nameMsg && <Alert variant={nameMsg.variant} className="py-2">{nameMsg.text}</Alert>}
                <Button type="submit" disabled={savingName || name.trim().length < 2 || name.trim() === profile.name}>
                  {savingName ? <Spinner size="sm" animation="border" /> : 'Guardar'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-transparent"><strong>Cambiar contraseña</strong></Card.Header>
            <Card.Body>
              <Form onSubmit={handleChangePassword}>
                <Form.Group className="mb-3">
                  <Form.Label>Contraseña actual</Form.Label>
                  <Form.Control type="password" autoComplete="current-password" value={passwords.current}
                    onChange={(e) => setPasswords(p => ({ ...p, current: e.target.value }))} required />
                </Form.Group>
                <Row>
                  <Col sm={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nueva</Form.Label>
                      <Form.Control type="password" autoComplete="new-password" value={passwords.next}
                        onChange={(e) => setPasswords(p => ({ ...p, next: e.target.value }))} required />
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Confirmar</Form.Label>
                      <Form.Control type="password" autoComplete="new-password" value={passwords.confirm}
                        onChange={(e) => setPasswords(p => ({ ...p, confirm: e.target.value }))} required />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Text className="d-block mb-3">Mínimo 8 caracteres.</Form.Text>
                {passwordMsg && <Alert variant={passwordMsg.variant} className="py-2">{passwordMsg.text}</Alert>}
                <Button type="submit" disabled={savingPassword}>
                  {savingPassword ? <Spinner size="sm" animation="border" /> : 'Cambiar contraseña'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </MainLayout>
  );
};

export default ProfilePage;
