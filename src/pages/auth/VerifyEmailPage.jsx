import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Row, Col, Card, Alert, Spinner, Button } from 'react-bootstrap';
import authService from '../../services/authService';
import logo from '../../assets/logo.png';
import './Auth.css';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        if (!token) {
          setStatus('error');
          setError('Token no proporcionado');
          return;
        }

        const response = await authService.verifyEmail(token);
        setStatus('success');
        setMessage(response.message);

        // Redirigir a login después de 3 segundos
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (err) {
        setStatus('error');
        setError(err.response?.data?.message || 'Error al verificar el email');
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="auth-container">
      <Row className="w-100 justify-content-center">
        <Col xs={11} sm={8} md={6} lg={5} xl={4}>
          <Card className="auth-card">
            <Card.Body>
              <div className="auth-header">
                <img src={logo} alt="Palomea Tareas" className="auth-logo-img" />
                <h2 className="auth-title">Palomea Tareas</h2>
                <p className="auth-subtitle">Verifica tu email</p>
              </div>

              {status === 'loading' && (
                <div className="d-flex justify-content-center align-items-center flex-column" style={{ minHeight: '300px' }}>
                  <Spinner animation="border" role="status" className="mb-3">
                    <span className="visually-hidden">Verificando email...</span>
                  </Spinner>
                  <p className="text-muted">Verificando tu email, por favor espera...</p>
                </div>
              )}

              {status === 'success' && (
                <>
                  <Alert className="alert-success mb-4">
                    <h5 className="alert-heading">¡Email verificado!</h5>
                    <p>{message}</p>
                  </Alert>
                  <p className="text-center text-muted mb-4">
                    Tu cuenta está completamente configurada. Serás redirigido al login en 3 segundos...
                  </p>
                  <Button variant="primary" className="w-100" onClick={() => navigate('/login')}>
                    Ir a Login Ahora
                  </Button>
                </>
              )}

              {status === 'error' && (
                <>
                  <Alert className="alert-danger mb-4">
                    <h5 className="alert-heading">Error en la verificación</h5>
                    <p>{error}</p>
                  </Alert>
                  <p className="text-center text-muted mb-4">
                    Intenta solicitar un nuevo enlace de verificación.
                  </p>
                  <Button variant="primary" className="w-100" onClick={() => navigate('/login')}>
                    Volver a Login
                  </Button>
                </>
              )}

              <div className="auth-footer mt-4">
                <small>
                  ¿Necesitas ayuda?{' '}
                  <Link to="/login" className="auth-link">Contáctanos</Link>
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default VerifyEmailPage;
