import { useState, useEffect, useCallback, useRef } from 'react';
import { Spinner, ProgressBar } from 'react-bootstrap';
import { FiPaperclip, FiX, FiAlertCircle, FiUpload } from 'react-icons/fi';
import attachmentService from '../../services/attachmentService';
import { useAttachmentsConfig } from '../../context/AppConfigContext';
import { validateFiles, isPreviewable, getFileType, triggerDownload, usePreventFileDrop } from '../../utils/fileUtils';
import ConfirmModal from '../common/ConfirmModal';
import AttachmentDropzone from './AttachmentDropzone';
import AttachmentItem from './AttachmentItem';
import AttachmentViewer from './AttachmentViewer';
import './Attachments.css';

/** Resumen para la tarjeta del tablero: cantidad + miniatura de la primera imagen */
const summarize = (items) => ({
  attachmentCount: items.length,
  cover: items.find((a) => a.thumbUrl)?.thumbUrl || null
});

/**
 * Archivos de una tarea: lista, subida, visor y borrado.
 *
 * @param {string}   taskId
 * @param {boolean}  canUpload        - Puede agregar archivos (misma regla que editar la tarea)
 * @param {Function} canDelete        - (attachment) => boolean
 * @param {Function} onSummaryChange  - ({ attachmentCount, cover }) cuando cambia la lista
 */
const TaskAttachments = ({ taskId, canUpload = false, canDelete = () => false, onSummaryChange }) => {
  const config = useAttachmentsConfig();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [uploads, setUploads] = useState([]); // [{ key, name, progress, error }]
  const [errors, setErrors] = useState([]);
  const [toDelete, setToDelete] = useState(null);
  // El nombre se guarda aparte: así no sale "undefined" mientras el modal de confirmación se desvanece
  const [deleteName, setDeleteName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [pasted, setPasted] = useState([]); // capturas pegadas con Ctrl+V, esperando confirmación
  const reloadedForThumbs = useRef(false);
  usePreventFileDrop();

  // Copia de la lista y del callback más recientes: las subidas que terminan con el modal
  // ya cerrado siguen actualizando la tarjeta del tablero
  const itemsRef = useRef([]);
  const onSummaryChangeRef = useRef(onSummaryChange);
  useEffect(() => { onSummaryChangeRef.current = onSummaryChange; });

  // isActive evita actualizar el estado si el modal ya se cerró cuando llega la respuesta
  const load = useCallback((isActive = () => true) =>
    attachmentService.list(taskId)
      .then((response) => {
        if (!isActive()) return;
        itemsRef.current = response.data || [];
        setItems(itemsRef.current);
        setLoadError(false);
      })
      .catch(() => isActive() && setLoadError(true))
      .finally(() => isActive() && setLoading(false)),
  [taskId]);

  // Quien lo usa le pone key={taskId}: al cambiar de tarea el componente se monta de nuevo
  useEffect(() => {
    if (!config.enabled || !taskId) return undefined;
    let active = true;
    load(() => active);
    return () => { active = false; };
  }, [config.enabled, taskId, load]);

  // Cambio hecho por el usuario (subida o borrado): se avisa a la tarjeta del tablero en el momento,
  // aunque el componente ya se haya desmontado (no en la carga inicial)
  const updateItems = (updater) => {
    itemsRef.current = updater(itemsRef.current);
    setItems(itemsRef.current);
    onSummaryChangeRef.current?.(summarize(itemsRef.current));
  };

  // Las miniaturas se firman por 1 hora; si el modal lleva mucho abierto, se recarga la lista una vez
  const handleThumbError = () => {
    if (reloadedForThumbs.current) return;
    reloadedForThumbs.current = true;
    load();
  };

  const uploadFiles = useCallback(async (files) => {
    const pending = uploads.filter((u) => !u.error).length;
    const { accepted, errors: rejected } = validateFiles(files, config, items.length + pending);
    setErrors(rejected);
    if (!accepted.length) return;

    const batch = accepted.map((file, i) => ({ key: `${Date.now()}-${i}`, name: file.name, progress: 0, file }));
    setUploads((prev) => [...prev, ...batch]);

    // Uno por uno: progreso claro por archivo y si uno falla los demás siguen
    for (const entry of batch) {
      const setEntry = (patch) => setUploads((prev) => prev.map((u) => (u.key === entry.key ? { ...u, ...patch } : u)));
      try {
        const response = await attachmentService.upload(taskId, [entry.file], (progress) => setEntry({ progress }));
        updateItems((prev) => [...prev, ...(response.data || [])]);
        setUploads((prev) => prev.filter((u) => u.key !== entry.key));
      } catch (err) {
        setEntry({ error: err.response?.data?.message || 'No se pudo subir el archivo. Revisa tu conexión.' });
      }
    }
  }, [config, items.length, uploads, taskId]);

  const handleDownload = async (attachment) => {
    try {
      triggerDownload(await attachmentService.getUrl(taskId, attachment.id));
    } catch {
      setErrors([`No se pudo descargar "${attachment.originalName}". Intenta de nuevo.`]);
    }
  };

  const confirmDelete = (attachment) => {
    setDeleteName(attachment.originalName);
    setToDelete(attachment);
  };

  // Lo pegado con Ctrl+V no se sube solo: puede venir de un campo de texto del modal
  const handlePaste = useCallback((files) => setPasted((prev) => [...prev, ...files]), []);
  const uploadPasted = () => {
    const files = pasted;
    setPasted([]);
    uploadFiles(files);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await attachmentService.remove(taskId, toDelete.id);
      updateItems((prev) => prev.filter((a) => a.id !== toDelete.id));
      setToDelete(null);
    } catch (err) {
      setErrors([err.response?.data?.message || 'No se pudo eliminar el archivo.']);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  if (!config.enabled) {
    return (
      <div className="task-attachments">
        <div className="attachments-header">
          <span className="attachments-title"><FiPaperclip size={14} /> Archivos</span>
        </div>
        <p className="attachments-disabled">Los archivos adjuntos no están habilitados.</p>
      </div>
    );
  }

  const images = items.filter((a) => a.thumbUrl);
  const documents = items.filter((a) => !a.thumbUrl);
  // Mismo orden que en pantalla: primero las imágenes y luego los documentos
  const previewables = [...images, ...documents].filter((a) => isPreviewable(a.originalName));
  const openViewer = (attachment) => setViewerIndex(previewables.findIndex((a) => a.id === attachment.id));
  const full = items.length >= config.maxPerTask;

  const renderItem = (attachment) => (
    <AttachmentItem
      key={attachment.id}
      attachment={attachment}
      onOpen={() => openViewer(attachment)}
      onDownload={() => handleDownload(attachment)}
      onDelete={canDelete(attachment) ? () => confirmDelete(attachment) : null}
      onThumbError={handleThumbError}
    />
  );

  return (
    <div className="task-attachments">
      <div className="attachments-header">
        <span className="attachments-title"><FiPaperclip size={14} /> Archivos</span>
        {items.length > 0 && <span className="attachments-count">{items.length}/{config.maxPerTask}</span>}
      </div>

      {loading ? (
        <div className="text-center py-2"><Spinner animation="border" size="sm" /></div>
      ) : loadError ? (
        <div className="attachments-error">
          <FiAlertCircle size={14} /> No se pudieron cargar los archivos.
          <button type="button" className="btn btn-link btn-sm p-0 ms-1" onClick={() => load()}>Reintentar</button>
        </div>
      ) : (
        <>
          {images.length > 0 && <div className="attachments-grid">{images.map(renderItem)}</div>}
          {documents.length > 0 && <div className="attachments-list">{documents.map(renderItem)}</div>}
          {items.length === 0 && uploads.length === 0 && !canUpload && (
            <p className="attachments-empty">Esta tarea no tiene archivos.</p>
          )}
        </>
      )}

      {uploads.length > 0 && (
        <div className="attachments-list">
          {uploads.map((u) => {
            const type = getFileType(u.name);
            const TypeIcon = type.icon;
            return (
              <div key={u.key} className={`attachment-row is-uploading ${u.error ? 'has-error' : ''}`}>
                <span className="attachment-row-icon" style={{ color: type.color, background: `${type.color}14` }}>
                  <TypeIcon size={18} />
                </span>
                <span className="attachment-row-text">
                  <span className="attachment-row-name">{u.name}</span>
                  {u.error
                    ? <span className="attachment-row-meta text-danger">{u.error}</span>
                    : <ProgressBar now={u.progress} className="attachment-progress" label={u.progress === 100 ? 'Procesando…' : ''} />}
                </span>
                {u.error && (
                  <button
                    type="button"
                    className="attachment-action"
                    onClick={() => setUploads((prev) => prev.filter((x) => x.key !== u.key))}
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

      {pasted.length > 0 && (
        <div className="attachments-pasted">
          <span className="flex-grow-1">
            {pasted.length === 1 ? `Pegaste "${pasted[0].name}".` : `Pegaste ${pasted.length} archivos.`} ¿Subirlos a la tarea?
          </span>
          <button type="button" className="btn btn-primary btn-sm" onClick={uploadPasted}>
            <FiUpload className="me-1" />Subir
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setPasted([])}>
            Cancelar
          </button>
        </div>
      )}

      {canUpload && !loading && !loadError && (
        full
          ? <p className="attachments-empty">Llegaste al máximo de {config.maxPerTask} archivos. Elimina alguno para agregar otro.</p>
          : <AttachmentDropzone onFiles={uploadFiles} onPaste={handlePaste} />
      )}

      <AttachmentViewer
        taskId={taskId}
        attachments={previewables}
        index={viewerIndex}
        onIndexChange={setViewerIndex}
        onClose={() => setViewerIndex(null)}
        onDownload={handleDownload}
      />

      <ConfirmModal
        show={!!toDelete}
        onHide={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar archivo"
        message={`¿Eliminar "${deleteName}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};

export default TaskAttachments;
