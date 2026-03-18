import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import authService from '../../services/authService';
import logo from '../../assets/logo.png';
import './Auth.css';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);

  // Validar token al cargar la página
  useEffect(() => {
    const validateToken = async () => {
      try {
        if (!token) {
          setError('Token no proporcionado');
          return;
        }
        await authService.validateResetToken(token);
        setValidatingToken(false);
      } catch (err) {
        setError(err.response?.data?.message || 'Token inválido o expirado');
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [token]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validar que las contraseñas coincidan
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    // Validar longitud de contraseña
    if (formData.newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword(token, formData.newPassword);
      setSuccess(true);
      setFormData({ newPassword: '', confirmPassword: '' });

      // Redirigir a login después de 2 segundos
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al reiniciar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Row className="w-100 justify-content-center">
        <Col xs={11} sm={8} md={6} lg={5} xl={4}>
          <Card className="auth-card">
            <Card.Body>
              <div className="auth-header">
                <img src={logo} alt="Palomea Tareas" className="auth-logo-img" />
                <h2 className="auth-title">Palomea Tareas</h2>
                <p className="auth-subtitle">Reinicia tu contraseña</p>
              </div>

              {error && <Alert className="auth-alert alert-danger">{error}</Alert>}

              {success && (
                <Alert className="auth-alert alert-success">
                  Tu contraseña ha sido reiniciada exitosamente.
                  Redirigiendo a login...
                </Alert>
              )}

              {validatingToken ? (
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Validando token...</span>
                  </Spinner>
                </div>
              ) : !error ? (
                <Form onSubmit={handleSubmit} className="auth-form">
                  <Form.Group className="mb-3">
                    <Form.Label>Nueva Contraseña</Form.Label>
                    <Form.Control
                      type="password"
                      name="newPassword"
                      placeholder="••••••••"
                      value={formData.newPassword}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Confirmar Contraseña</Form.Label>
                    <Form.Control
                      type="password"
                      name="confirmPassword"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>

                  <Button
                    type="submit"
                    className="w-100 btn-auth"
                    disabled={loading}
                  >
                    {loading ? 'Reiniciando...' : 'Reiniciar Contraseña'}
                  </Button>
                </Form>
              ) : null}

              <div className="auth-footer">
                <small>
                  <Link to="/login" className="auth-link">Volver a login</Link>
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ResetPasswordPage;
