import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';
import './Auth.css';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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

      // Si el registro requiere verificación de email
      if (result?.requiresEmailVerification) {
        setSuccess(true);
        setRegisteredEmail(formData.email);
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });

        // Redirigir a login después de 5 segundos
        setTimeout(() => {
          navigate('/login');
        }, 5000);
      } else {
        // Si el email ya está verificado (fallback)
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrarse');
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
                  <Form onSubmit={handleSubmit} className="auth-form">
                    <Form.Group className="mb-3">
                      <Form.Label>Nombre</Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        placeholder="Tu nombre"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        placeholder="tu@email.com"
                        value={formData.email}
                        onChange={handleChange}
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
  );
};

export default RegisterPage;