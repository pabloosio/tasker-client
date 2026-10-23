import { FiDownload, FiTrash2, FiMaximize2 } from 'react-icons/fi';
import { formatFileSize, getFileType, isPreviewable } from '../../utils/fileUtils';
import { humanizeDate } from '../../utils/dateUtils';

/**
 * Un archivo adjunto. Las imágenes se muestran como miniatura; el resto como fila con icono.
 * onDelete es null cuando el usuario no puede borrarlo.
 */
const AttachmentItem = ({ attachment, onOpen, onDownload, onDelete, onThumbError }) => {
  const { originalName, sizeBytes, thumbUrl, uploader, createdAt } = attachment;
  const type = getFileType(originalName);
  const TypeIcon = type.icon;
  const previewable = isPreviewable(originalName);
  const meta = [formatFileSize(sizeBytes), uploader?.name, humanizeDate(createdAt)].filter(Boolean).join(' · ');

  const stop = (fn) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  if (thumbUrl) {
    return (
      <div className="attachment-tile" title={`${originalName}\n${meta}`}>
        <button type="button" className="attachment-tile-preview" onClick={stop(onOpen)} aria-label={`Ver ${originalName}`}>
          <img src={thumbUrl} alt={originalName} loading="lazy" draggable={false} onError={onThumbError} />
          <span className="attachment-tile-zoom"><FiMaximize2 size={14} /></span>
        </button>
        <div className="attachment-tile-actions">
          <button type="button" className="attachment-action" onClick={stop(onDownload)} title="Descargar">
            <FiDownload size={13} />
          </button>
          {onDelete && (
            <button type="button" className="attachment-action is-danger" onClick={stop(onDelete)} title="Eliminar">
              <FiTrash2 size={13} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="attachment-row">
      <button
        type="button"
        className="attachment-row-main"
        onClick={stop(previewable ? onOpen : onDownload)}
        title={previewable ? `Ver ${originalName}` : `Descargar ${originalName}`}
      >
        <span className="attachment-row-icon" style={{ color: type.color, background: `${type.color}14` }}>
          <TypeIcon size={18} />
        </span>
        <span className="attachment-row-text">
          <span className="attachment-row-name">{originalName}</span>
          <span className="attachment-row-meta">{type.label} · {meta}</span>
        </span>
      </button>
      <button type="button" className="attachment-action" onClick={stop(onDownload)} title="Descargar">
        <FiDownload size={14} />
      </button>
      {onDelete && (
        <button type="button" className="attachment-action is-danger" onClick={stop(onDelete)} title="Eliminar">
          <FiTrash2 size={14} />
        </button>
      )}
    </div>
  );
};

export default AttachmentItem;
