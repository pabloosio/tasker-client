import { useState, useEffect, useMemo } from 'react';
import { FiPaperclip, FiX } from 'react-icons/fi';
import { useAttachmentsConfig } from '../../context/AppConfigContext';
import { validateFiles, formatFileSize, getFileType, isImage, usePreventFileDrop } from '../../utils/fileUtils';
import AttachmentDropzone from './AttachmentDropzone';
import './Attachments.css';

/**
 * Archivos elegidos al CREAR una tarea: quedan en memoria y se suben al guardar
 * (la tarea todavía no existe). Controlado: files / onChange.
 */
const PendingAttachments = ({ files, onChange, disabled = false }) => {
  const config = useAttachmentsConfig();
  const [errors, setErrors] = useState([]);
  usePreventFileDrop();

  // Vista previa local de las imágenes; se liberan al quitar archivos o cerrar
  const previews = useMemo(
    () => new Map(files.filter((f) => isImage(f.name)).map((f) => [f, URL.createObjectURL(f)])),
    [files]
  );
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  if (!config.enabled) return null;

  const addFiles = (incoming) => {
    const { accepted, errors: rejected } = validateFiles(incoming, config, files.length);
    setErrors(rejected);
    if (accepted.length) onChange([...files, ...accepted]);
  };

  return (
    <div className="task-attachments">
      <div className="attachments-header">
        <span className="attachments-title"><FiPaperclip size={14} /> Archivos</span>
        {files.length > 0 && <span className="attachments-count">{files.length}/{config.maxPerTask} · se subirán al crear la tarea</span>}
      </div>

      {files.length > 0 && (
        <div className="attachments-list">
          {files.map((file, i) => {
            const type = getFileType(file.name);
            const TypeIcon = type.icon;
            const preview = previews.get(file);
            return (
              <div key={`${file.name}-${i}`} className="attachment-row">
                <span className="attachment-row-main is-static">
                  {preview
                    ? <img src={preview} alt="" className="attachment-row-thumb" />
                    : <span className="attachment-row-icon" style={{ color: type.color, background: `${type.color}14` }}><TypeIcon size={18} /></span>}
                  <span className="attachment-row-text">
                    <span className="attachment-row-name">{file.name}</span>
                    <span className="attachment-row-meta">{type.label} · {formatFileSize(file.size)}</span>
                  </span>
                </span>
                {!disabled && (
                  <button
                    type="button"
                    className="attachment-action"
                    onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                    title="Quitar"
                  >
                    <FiX size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {errors.length > 0 && (
        <div className="attachments-error">
          <div className="flex-grow-1">{errors.map((e, i) => <div key={i}>{e}</div>)}</div>
          <button type="button" className="attachment-action" onClick={() => setErrors([])} title="Cerrar"><FiX size={14} /></button>
        </div>
      )}

      {files.length < config.maxPerTask && <AttachmentDropzone onFiles={addFiles} disabled={disabled} />}
    </div>
  );
};

export default PendingAttachments;
