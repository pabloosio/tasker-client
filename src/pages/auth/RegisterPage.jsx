import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';
import { AuthFeaturesDesktop, AuthFeaturesMobile } from './AuthFeaturesPanel';
import './Auth.css';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password
      });

      if (result?.requiresEmailVerification) {
        setSuccess(true);
        setRegisteredEmail(formData.email);
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });

        setTimeout(() => {
          navigate('/login');
        }, 5000);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Helmet>
      <title>Crear Cuenta Gratis — Palomea Tareas | Gestión de Tareas con Kanban</title>
      <meta name="description" content="Regístrate gratis en Palomea Tareas. Organiza tus tareas con un tablero Kanban, crea subtareas, asigna prioridades y colabora con tu equipo. Sin costo." />
      <meta property="og:title" content="Crear Cuenta Gratis — Palomea Tareas" />
      <meta property="og:description" content="Regístrate gratis y empieza a organizar tu trabajo con un tablero Kanban. Gestiona tareas, equipos y proyectos en un solo lugar." />
    </Helmet>
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
                <p className="auth-subtitle">Crea tu cuenta</p>
              </div>

              {error && <Alert className="auth-alert alert-danger">{error}</Alert>}

              {success && (
                <Alert className="auth-alert alert-success">
                  <h5 className="alert-heading">¡Registro Exitoso! ✓</h5>
                  <p>
                    Te hemos enviado un email de verificación a <strong>{registeredEmail}</strong>
                  </p>
                  <hr />
                  <p className="mb-2">
                    <strong>Próximos pasos:</strong>
                  </p>
                  <ul className="mb-0">
                    <li>Revisa tu bandeja de entrada</li>
                    <li><strong>Importante:</strong> Revisa también la carpeta de SPAM</li>
                    <li>Haz click en el enlace de verificación</li>
                    <li>Luego podrás iniciar sesión</li>
                  </ul>
                  <hr />
                  <p className="text-muted mb-0">
                    Serás redirigido a login en 5 segundos...
                  </p>
                </Alert>
              )}

              {!success && (
                <>
                  <Form onSubmit={handleSubmit} className="auth-form" autoComplete="off">
                    <Form.Group className="mb-3">
                      <Form.Label>Nombre</Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        placeholder="Tu nombre"
                        value={formData.name}
                        onChange={handleChange}
                        autoComplete="off"
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Correo electrónico</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        placeholder="tu@correo.com"
                        value={formData.email}
                        onChange={handleChange}
                        autoComplete="off"
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
                          autoComplete="new-password"
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
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label>Confirmar contraseña</Form.Label>
                      <div className="auth-password-wrapper">
                        <Form.Control
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          placeholder="••••••••"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          className="auth-password-toggle"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          tabIndex={-1}
                          aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                          {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                        </button>
                      </div>
                    </Form.Group>

                    <Button
                      type="submit"
                      className="w-100 btn-auth"
                      disabled={loading}
                    >
                      {loading ? 'Registrando...' : 'Crear Cuenta'}
                    </Button>
                  </Form>

                  <div className="auth-footer">
                    <small>
                      ¿Ya tienes cuenta?{' '}
                      <Link to="/login" className="auth-link">Inicia sesión aquí</Link>
                    </small>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

      </Row>
    </div>
    </>
  );
};

export default RegisterPage;
