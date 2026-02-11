import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';
import './Auth.css';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: import.meta.env.DEV ? import.meta.env.VITE_DEV_EMAIL || '' : '',
    password: import.meta.env.DEV ? import.meta.env.VITE_DEV_PASSWORD || '' : ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const errorRef = useRef(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Scroll al error cuando aparece
  useEffect(() => {
    if (error && errorRef.current) {
      // Usar setTimeout para asegurar que el DOM está actualizado
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [error]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
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
                <p className="auth-subtitle">Inicia sesión en tu cuenta</p>
              </div>

              {error && (
                <div ref={errorRef} className="mb-3">
                  <Alert
                    className="auth-alert alert-danger d-flex align-items-center gap-2 mb-0"
                    role="alert"
                  >
                    <FiAlertCircle className="flex-shrink-0" size={20} />
                    <div>{error}</div>
                  </Alert>
                </div>
              )}

              <Form className="auth-form" onSubmit={(e) => e.preventDefault()}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                    disabled={loading}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Contraseña</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                    disabled={loading}
                    required
                  />
                  <small className="d-block text-end mt-2">
                    <Link to="/forgot-password" className="auth-link">
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </small>
                </Form.Group>

                <Button
                  type="button"
                  className="w-100 btn-auth"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Button>
              </Form>

              <div className="auth-footer">
                <small>
                  ¿No tienes cuenta?{' '}
                  <Link to="/register" className="auth-link">Regístrate aquí</Link>
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default LoginPage;