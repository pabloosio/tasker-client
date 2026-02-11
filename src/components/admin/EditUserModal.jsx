import { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import adminService from '../../services/adminService';

const EditUserModal = ({ show, user, onHide, onSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    role: 'USER',
    isActive: true
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [changes, setChanges] = useState({});

  // Cargar datos del usuario cuando se abre el modal
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        role: user.role || 'USER',
        isActive: user.isActive !== false
      });
      setChanges({});
      setError('');
      setSuccess('');
    }
  }, [user, show]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setFormData({
      ...formData,
      [name]: newValue
    });

    // Trackear cambios realizados
    setChanges({
      ...changes,
      [name]: newValue
    });
  };

  const handleUpdateEmail = async () => {
    if (!changes.email) return;

    setLoading(true);
    setError('');

    try {
      await adminService.updateUserEmail(user.id, formData.email);
      setSuccess('Email actualizado exitosamente');
      setTimeout(() => onSuccess(), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar email');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!('isActive' in changes)) return;

    setLoading(true);
    setError('');

    try {
      await adminService.toggleUserActive(user.id, formData.isActive);
      setSuccess(`Usuario ${formData.isActive ? 'activado' : 'desactivado'} exitosamente`);
      setTimeout(() => onSuccess(), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cambiar estado');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!changes.role) return;

    setLoading(true);
    setError('');

    try {
      await adminService.updateUserRole(user.id, formData.role);
      setSuccess('Rol actualizado exitosamente');
      setTimeout(() => onSuccess(), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar rol');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    setLoading(true);
    setError('');

    try {
      await adminService.verifyUserEmail(user.id);
      setSuccess('Email verificado manualmente exitosamente');
      setTimeout(() => onSuccess(), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al verificar email');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Editar Usuario</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <div className="mb-4">
          <h6 className="text-muted">Información del Usuario</h6>
          <p className="mb-1">
            <strong>Nombre:</strong> {user.name}
          </p>
          <p className="mb-3">
            <strong>ID:</strong> <code style={{ fontSize: '0.85em' }}>{user.id}</code>
          </p>
          <p className="mb-0">
            <strong>Registrado:</strong> {new Date(user.createdAt).toLocaleDateString('es-ES')}
          </p>
        </div>

        <hr />

        <Form>
          {/* EMAIL */}
          <Form.Group className="mb-4">
            <Form.Label className="fw-bold">Email</Form.Label>
            <div className="d-flex gap-2">
              <Form.Control
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
              <Button
                variant="primary"
                onClick={handleUpdateEmail}
                disabled={loading || !changes.email}
              >
                Actualizar
              </Button>
            </div>
            {user.emailVerified ? (
              <small className="text-success d-block mt-2">✓ Email verificado</small>
            ) : (
              <small className="text-warning d-block mt-2">✗ Email no verificado</small>
            )}
          </Form.Group>

          {/* ROL */}
          <Form.Group className="mb-4">
            <Form.Label className="fw-bold">Rol</Form.Label>
            <div className="d-flex gap-2">
              <Form.Select
                name="role"
                value={formData.role}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </Form.Select>
              <Button
                variant="primary"
                onClick={handleUpdateRole}
                disabled={loading || !changes.role}
              >
                Cambiar
              </Button>
            </div>
            <small className="text-muted d-block mt-2">
              Rol actual: <strong>{user.role}</strong>
            </small>
          </Form.Group>

          {/* ESTADO */}
          <Form.Group className="mb-4">
            <Form.Check
              type="checkbox"
              name="isActive"
              label="Cuenta Activa"
              checked={formData.isActive}
              onChange={handleChange}
              disabled={loading}
            />
            <div className="d-flex gap-2 mt-2">
              <Button
                variant={formData.isActive ? 'success' : 'danger'}
                onClick={handleToggleActive}
                disabled={loading || !('isActive' in changes)}
                size="sm"
              >
                {formData.isActive ? 'Desactivar' : 'Activar'}
              </Button>
            </div>
            <small className="text-muted d-block mt-2">
              Estado: <strong>{user.isActive ? 'Activo' : 'Inactivo'}</strong>
            </small>
          </Form.Group>

          {/* VERIFICAR EMAIL MANUALMENTE */}
          {!user.emailVerified && (
            <Form.Group className="mb-0">
              <Button
                variant="warning"
                onClick={handleVerifyEmail}
                disabled={loading}
                className="w-100"
              >
                Verificar Email Manualmente
              </Button>
              <small className="text-muted d-block mt-2">
                Marca el email como verificado sin enviar enlace
              </small>
            </Form.Group>
          )}
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditUserModal;
