import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { FiAlertCircle, FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';
import { AuthFeaturesDesktop, AuthFeaturesMobile } from './AuthFeaturesPanel';
import './Auth.css';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: import.meta.env.DEV ? import.meta.env.VITE_DEV_EMAIL || '' : '',
    password: import.meta.env.DEV ? import.meta.env.VITE_DEV_PASSWORD || '' : ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const errorRef = useRef(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (error && errorRef.current) {
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [error]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
      <Row className="w-100 justify-content-center align-items-center g-4" style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Panel izquierdo — solo desktop */}
        <Col lg={6} xl={7} className="d-none d-lg-block">
          <AuthFeaturesDesktop />
        </Col>

        {/* Formulario */}
        <Col xs={11} sm={9} md={7} lg={5} xl={4}>

          {/* Tira de features — solo mobile, encima del card */}
          <AuthFeaturesMobile />

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
                  <Form.Label>Correo electrónico</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    placeholder="tu@correo.com"
                    value={formData.email}
                    onChange={handleChange}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                    disabled={loading}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Contraseña</Form.Label>
                  <div className="auth-password-wrapper">
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
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
