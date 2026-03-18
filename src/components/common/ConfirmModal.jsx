import { Modal, Button, Spinner } from 'react-bootstrap';
import { FiAlertTriangle, FiTrash2, FiAlertCircle } from 'react-icons/fi';

const ConfirmModal = ({
  show,
  onHide,
  onConfirm,
  title = '¿Estás seguro?',
  message = '¿Deseas continuar con esta acción?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger', // 'danger', 'warning', 'primary'
  loading = false,
  icon = null
}) => {
  const getIcon = () => {
    if (icon) return icon;
    switch (variant) {
      case 'danger':
        return <FiTrash2 />;
      case 'warning':
        return <FiAlertTriangle />;
      default:
        return <FiAlertCircle />;
    }
  };

  const getIconClass = () => {
    switch (variant) {
      case 'danger':
        return 'confirm-modal-icon-danger';
      case 'warning':
        return 'confirm-modal-icon-warning';
      default:
        return 'confirm-modal-icon-primary';
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="sm">
      <Modal.Body className="text-center py-4">
        <div className={`confirm-modal-icon ${getIconClass()} mb-3`}>
          {getIcon()}
        </div>
        <h5 className="mb-2">{title}</h5>
        <p className="text-muted mb-4">{message}</p>
        <div className="d-flex gap-2 justify-content-center">
          <Button
            variant="outline-secondary"
            onClick={onHide}
            disabled={loading}
            className="px-4"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            disabled={loading}
            className="px-4"
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Procesando...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default ConfirmModal;
