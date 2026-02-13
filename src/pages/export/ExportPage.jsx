import { useState } from 'react';
import { Card, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { FiDownload, FiFileText, FiGrid } from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';
import exportService from '../../services/exportService';

const ExportPage = () => {
  const [loading, setLoading] = useState({ excel: false, pdf: false });
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState(null);
  const [success, setSuccess] = useState('');

  const handleDownloadExcel = async () => {
    setLoading(prev => ({ ...prev, excel: true }));
    setError('');
    setErrorDetails(null);
    setSuccess('');

    try {
      await exportService.downloadExcel();
      setSuccess('Descarga de Excel iniciada');
    } catch (err) {
      setError(err?.message || 'Error al descargar el archivo Excel');
      setErrorDetails(err?.details || null);
    } finally {
      setLoading(prev => ({ ...prev, excel: false }));
    }
  };

  const handleDownloadPdf = async () => {
    setLoading(prev => ({ ...prev, pdf: true }));
    setError('');
    setErrorDetails(null);
    setSuccess('');

    try {
      await exportService.downloadPdf();
      setSuccess('Descarga de PDF iniciada');
    } catch (err) {
      setError(err?.message || 'Error al descargar el archivo PDF');
      setErrorDetails(err?.details || null);
    } finally {
      setLoading(prev => ({ ...prev, pdf: false }));
    }
  };

  return (
    <MainLayout>
      <div className="export-page">
        <div className="page-header mb-4">
          <h4 className="mb-1">
            <FiDownload className="me-2" style={{ color: 'var(--primary)' }} />
            Exportar Tareas
          </h4>
          <p className="text-muted mb-0">
            Descarga tus tareas en formato Excel o PDF
          </p>
        </div>

        {error && (
          <Alert
            variant="danger"
            dismissible
            onClose={() => {
              setError('');
              setErrorDetails(null);
            }}
            className="mb-4"
          >
            {error}
            {errorDetails && (
              <details className="mt-2">
                <summary className="small">Ver detalles</summary>
                <pre className="small mb-0 mt-2" style={{ whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(errorDetails, null, 2)}
                </pre>
              </details>
            )}
          </Alert>
        )}

        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess('')} className="mb-4">
            {success}
          </Alert>
        )}

        <Row className="g-4">
          {/* Excel Card */}
          <Col md={6}>
            <Card className="export-card h-100">
              <Card.Body className="d-flex flex-column align-items-center text-center p-4">
                <div className="export-icon-wrapper mb-3" style={{ background: '#E8F5E9' }}>
                  <FiGrid size={32} style={{ color: '#4CAF50' }} />
                </div>
                <h5 className="mb-2">Excel (.xlsx)</h5>
                <p className="text-muted small mb-4">
                  Exporta tus tareas a una hoja de cálculo con formato, colores por prioridad y estado. Ideal para análisis y edición.
                </p>
                <Button
                  variant="success"
                  className="mt-auto export-btn"
                  onClick={handleDownloadExcel}
                  disabled={loading.excel || loading.pdf}
                >
                  {loading.excel ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <FiDownload className="me-2" />
                      Descargar Excel
                    </>
                  )}
                </Button>
              </Card.Body>
            </Card>
          </Col>

          {/* PDF Card */}
          <Col md={6}>
            <Card className="export-card h-100">
              <Card.Body className="d-flex flex-column align-items-center text-center p-4">
                <div className="export-icon-wrapper mb-3" style={{ background: '#FFEBEE' }}>
                  <FiFileText size={32} style={{ color: '#E53935' }} />
                </div>
                <h5 className="mb-2">PDF (.pdf)</h5>
                <p className="text-muted small mb-4">
                  Genera un reporte profesional con resumen de tareas agrupadas por estado. Perfecto para imprimir o compartir.
                </p>
                <Button
                  variant="danger"
                  className="mt-auto export-btn"
                  onClick={handleDownloadPdf}
                  disabled={loading.excel || loading.pdf}
                >
                  {loading.pdf ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <FiDownload className="me-2" />
                      Descargar PDF
                    </>
                  )}
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Info adicional */}
        <Card className="mt-4 border-0" style={{ background: 'var(--primary-pastel)' }}>
          <Card.Body className="py-3">
            <p className="mb-0 small" style={{ color: 'var(--primary-dark)' }}>
              <strong>Nota:</strong> Los archivos incluyen todas tus tareas con su título, descripción, estado, prioridad, categoría y fechas relevantes.
            </p>
          </Card.Body>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ExportPage;
