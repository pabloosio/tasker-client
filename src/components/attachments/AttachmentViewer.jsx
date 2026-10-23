import { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Spinner } from 'react-bootstrap';
import { FiX, FiChevronLeft, FiChevronRight, FiDownload, FiExternalLink, FiAlertCircle } from 'react-icons/fi';
import attachmentService from '../../services/attachmentService';
import { formatFileSize, getFileType, isImage, isPdf } from '../../utils/fileUtils';

// Las URLs firmadas duran 5 min; se vuelven a pedir un poco antes
const URL_MAX_AGE_MS = 4 * 60 * 1000;

/**
 * Visor a pantalla completa. Imágenes y PDF se ven aquí; con ← / → se recorre la lista
 * y Esc cierra. Las URLs se piden al abrir cada archivo y se renuevan si ya tienen más de 4 min.
 */
const AttachmentViewer = ({ taskId, attachments, index, onIndexChange, onClose, onDownload }) => {
  const [urls, setUrls] = useState({}); // { [id]: { url, at } }
  const [failed, setFailed] = useState({});
  const retried = useRef({});

  const current = index !== null ? attachments[index] : null;
  const total = attachments.length;

  const go = useCallback((delta) => {
    if (total > 1) onIndexChange((index + delta + total) % total);
  }, [index, total, onIndexChange]);

  // Pedir la URL del archivo actual si no hay una o si ya está por vencer
  useEffect(() => {
    if (!current || failed[current.id]) return;
    const cached = urls[current.id];
    if (cached && Date.now() - cached.at < URL_MAX_AGE_MS) return;
    attachmentService.getUrl(taskId, current.id, { inline: true })
      .then((url) => setUrls((prev) => ({ ...prev, [current.id]: { url, at: Date.now() } })))
      .catch(() => setFailed((prev) => ({ ...prev, [current.id]: true })));
  }, [current, taskId, urls, failed]);

  // Si la imagen no carga (URL vencida), se pide una nueva una vez; si vuelve a fallar se muestra el error
  const handleImageError = () => {
    const { id } = current;
    if (retried.current[id]) {
      setFailed((prev) => ({ ...prev, [id]: true }));
      return;
    }
    retried.current[id] = true;
    setUrls((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const retry = () => {
    const { id } = current;
    retried.current[id] = false;
    setUrls((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setFailed((prev) => ({ ...prev, [id]: false }));
  };

  useEffect(() => {
    if (!current) return undefined;
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [current, go]);

  // Al cerrar se olvidan las URLs (caducan en pocos minutos)
  const handleClose = () => {
    setUrls({});
    setFailed({});
    retried.current = {};
    onClose();
  };

  if (!current) return null;

  const url = urls[current.id]?.url;
  const type = getFileType(current.originalName);
  const TypeIcon = type.icon;

  const renderContent = () => {
    if (failed[current.id]) {
      return (
        <div className="attachment-viewer-message">
          <FiAlertCircle size={36} />
          <p>No se pudo abrir el archivo. Revisa tu conexión e intenta de nuevo.</p>
          <button type="button" className="btn btn-light" onClick={retry}>Reintentar</button>
        </div>
      );
    }
    if (isImage(current.originalName)) {
      return (
        <div className="attachment-viewer-image">
          {/* La miniatura se muestra mientras carga la imagen completa */}
          {current.thumbUrl && !url && <img src={current.thumbUrl} alt="" className="is-placeholder" />}
          {url && <img key={url} src={url} alt={current.originalName} onError={handleImageError} />}
          {!url && <Spinner animation="border" variant="light" className="attachment-viewer-spinner" />}
        </div>
      );
    }
    if (isPdf(current.originalName)) {
      return url
        ? <iframe src={url} title={current.originalName} className="attachment-viewer-pdf" />
        : <Spinner animation="border" variant="light" />;
    }
    return (
      <div className="attachment-viewer-message">
        <span className="attachment-viewer-file-icon" style={{ color: type.color }}><TypeIcon size={48} /></span>
        <p className="mb-1"><strong>{current.originalName}</strong></p>
        <p>Este tipo de archivo no se puede ver aquí. Descárgalo para abrirlo.</p>
        <button type="button" className="btn btn-light" onClick={() => onDownload(current)}>
          <FiDownload className="me-2" />Descargar
        </button>
      </div>
    );
  };

  return (
    <Modal
      show
      onHide={handleClose}
      fullscreen
      contentClassName="attachment-viewer"
      backdropClassName="attachment-viewer-backdrop"
      aria-label={`Vista previa de ${current.originalName}`}
    >
      <div className="attachment-viewer-header">
        <div className="attachment-viewer-title">
          <span className="text-truncate">{current.originalName}</span>
          <small>
            {formatFileSize(current.sizeBytes)}
            {total > 1 && ` · ${index + 1} de ${total}`}
          </small>
        </div>
        <div className="d-flex gap-1">
          {url && isPdf(current.originalName) && (
            <a className="attachment-viewer-btn" href={url} target="_blank" rel="noopener noreferrer" title="Abrir en otra pestaña">
              <FiExternalLink size={18} />
            </a>
          )}
          <button type="button" className="attachment-viewer-btn" onClick={() => onDownload(current)} title="Descargar">
            <FiDownload size={18} />
          </button>
          <button type="button" className="attachment-viewer-btn" onClick={handleClose} title="Cerrar (Esc)">
            <FiX size={20} />
          </button>
        </div>
      </div>

      <div className="attachment-viewer-body" onClick={(e) => e.target === e.currentTarget && handleClose()}>
        {total > 1 && (
          <button type="button" className="attachment-viewer-nav is-prev" onClick={() => go(-1)} aria-label="Anterior">
            <FiChevronLeft size={28} />
          </button>
        )}
        {renderContent()}
        {total > 1 && (
          <button type="button" className="attachment-viewer-nav is-next" onClick={() => go(1)} aria-label="Siguiente">
            <FiChevronRight size={28} />
          </button>
        )}
      </div>
    </Modal>
  );
};

export default AttachmentViewer;
