import { useState, useRef, useEffect } from 'react';
import { FiUploadCloud } from 'react-icons/fi';
import { useAttachmentsConfig } from '../../context/AppConfigContext';
import { nameForPastedFile } from '../../utils/fileUtils';

/**
 * Zona para agregar archivos: clic, arrastrar y soltar, o pegar (Ctrl+V) una captura.
 * Solo entrega los archivos con onFiles; quien la usa decide si subirlos o dejarlos pendientes.
 * onPaste (opcional) recibe lo pegado por separado, para pedir confirmación antes de subirlo.
 */
const AttachmentDropzone = ({ onFiles, onPaste, disabled = false, enablePaste = true }) => {
  const config = useAttachmentsConfig();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const dragDepth = useRef(0);

  const accept = config.extensions.map((ext) => `.${ext}`).join(',');

  // Pegar imágenes desde el portapapeles en cualquier parte del modal.
  // Si lo pegado es solo texto, no se intercepta (los campos de texto siguen funcionando).
  useEffect(() => {
    if (!enablePaste || disabled) return undefined;
    const handlePaste = (e) => {
      const files = Array.from(e.clipboardData?.files || []);
      if (!files.length) return;
      e.preventDefault();
      (onPaste || onFiles)(files.map(nameForPastedFile));
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [enablePaste, disabled, onFiles, onPaste]);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) onFiles(files);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    if (disabled) return;
    dragDepth.current += 1;
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragDepth.current = Math.max(dragDepth.current - 1, 0);
    if (dragDepth.current === 0) setDragging(false);
  };

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={`attachment-dropzone ${dragging ? 'is-dragging' : ''} ${disabled ? 'is-disabled' : ''}`}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPicker();
        }
      }}
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <FiUploadCloud size={22} className="attachment-dropzone-icon" />
      <div className="attachment-dropzone-text">
        <strong>{dragging ? 'Suelta los archivos aquí' : 'Arrastra archivos o haz clic para elegir'}</strong>
        <span>
          Imágenes, PDF, Word, Excel y más · hasta {config.maxFileMb} MB c/u
          {enablePaste && <span className="d-none d-md-inline"> · también puedes pegar capturas con Ctrl+V</span>}
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = ''; // permite volver a elegir el mismo archivo
          if (files.length) onFiles(files);
        }}
      />
    </div>
  );
};

export default AttachmentDropzone;
