import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import authService from '../../services/authService';
import logo from '../../assets/logo.png';
import './Auth.css';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await authService.forgotPassword(email);
      setSuccess(true);
      setEmail('');

      // Redirigir después de 3 segundos
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al procesar la solicitud');
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
                <p className="auth-subtitle">Recupera tu contraseña</p>
              </div>

              {error && <Alert className="auth-alert alert-danger">{error}</Alert>}

              {success && (
                <Alert className="auth-alert alert-success">
                  <h6 className="mb-3">¡Email Enviado! ✓</h6>
                  <p className="mb-2">
                    Te hemos enviado un email con las instrucciones para reiniciar tu contraseña.
                  </p>
                  <p className="fw-bold mb-3">Próximos pasos:</p>
                  <ul className="mb-3" style={{ paddingLeft: '1.25rem' }}>
                    <li className="mb-2">Revisa tu <strong>bandeja de entrada</strong></li>
                    <li className="mb-2">Importante: Revisa también la carpeta de <strong>SPAM</strong></li>
                    <li className="mb-2">También verifica la carpeta de <strong>TRASH</strong></li>
                    <li>Haz click en el enlace para reiniciar tu contraseña</li>
                  </ul>
                  <small className="text-muted">
                    Redirigiendo a login en 3 segundos...
                  </small>
                </Alert>
              )}

              {!success && (
                <>
                  <p className="text-muted text-center mb-4">
                    Ingresa tu email y te enviaremos un enlace para reiniciar tu contraseña.
                  </p>

                  <Form onSubmit={handleSubmit} className="auth-form">
                    <Form.Group className="mb-4">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </Form.Group>

                    <Button
                      type="submit"
                      className="w-100 btn-auth"
                      disabled={loading}
                    >
                      {loading ? 'Enviando...' : 'Enviar Instrucciones'}
                    </Button>
                  </Form>
                </>
              )}

              <div className="auth-footer">
                <small>
                  ¿Recordaste tu contraseña?{' '}
                  <Link to="/login" className="auth-link">Vuelve a login</Link>
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ForgotPasswordPage;
