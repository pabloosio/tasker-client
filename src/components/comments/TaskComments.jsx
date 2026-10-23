import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { FiMessageSquare, FiAlertCircle, FiEdit2, FiTrash2, FiSend } from 'react-icons/fi';
import commentService from '../../services/commentService';
import { useAuth } from '../../context/AuthContext';
import { humanizeDate, formatDateTime } from '../../utils/dateUtils';
import ConfirmModal from '../common/ConfirmModal';
import CommentText from './CommentText';
import MentionTextarea from './MentionTextarea';
import { toMarkup, fromMarkup } from '../../utils/mentions';
import './Comments.css';

const MAX_LENGTH = 2000;
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

const autosize = (el) => {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight + 2, 240)}px`;
};

/**
 * Comentarios de una tarea: notas de seguimiento ("se atrasó porque…", enlaces, acuerdos).
 * Cualquiera que pueda ver la tarea puede comentar; editar solo el autor;
 * borrar el autor o un administrador del tablero (la API valida lo mismo).
 *
 * @param {string}   taskId
 * @param {boolean}  canComment     - Mostrar el cuadro para escribir
 * @param {boolean}  canModerate    - OWNER/ADMIN: puede borrar comentarios de otros
 * @param {Function} onCountChange  - (count) cuando se agrega o borra un comentario
 * @param {Function} onDraftChange  - (hayTextoSinEnviar) para avisar antes de cerrar el modal
 */
const TaskComments = ({ taskId, canComment = true, canModerate = false, onCountChange, onDraftChange }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftMentions, setDraftMentions] = useState({});
  const [editMentions, setEditMentions] = useState({});
  // Miembros del tablero para @mencionar (si falla, simplemente no hay sugerencias)
  const [mentionable, setMentionable] = useState({ members: [], canInvite: false, workspaceId: null });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleteAuthor, setDeleteAuthor] = useState('');
  const [deleting, setDeleting] = useState(false);
  const composerRef = useRef(null);

  // isActive evita actualizar el estado si el modal ya se cerró cuando llega la respuesta
  const load = useCallback((isActive = () => true) =>
    commentService.list(taskId)
      .then((response) => {
        if (!isActive()) return;
        setComments(response.data || []);
        setLoadError(false);
      })
      .catch(() => isActive() && setLoadError(true))
      .finally(() => isActive() && setLoading(false)),
  [taskId]);

  useEffect(() => {
    if (!taskId) return undefined;
    let active = true;
    load(() => active);
    commentService.mentionable(taskId)
      .then((res) => active && setMentionable(res.data))
      .catch(() => {});
    return () => { active = false; };
  }, [taskId, load]);

  const inviteUrl = mentionable.canInvite && mentionable.workspaceId ? `/workspaces/${mentionable.workspaceId}` : null;

  const updateDraft = (value) => {
    setDraft(value);
    onDraftChange?.(value.trim().length > 0);
  };

  const handleSend = async () => {
    const content = toMarkup(draft, draftMentions).trim();
    if (!content || sending) return;
    setSending(true);
    setError('');
    try {
      const response = await commentService.create(taskId, content);
      const next = [...comments, response.data];
      setComments(next);
      onCountChange?.(next.length);
      updateDraft('');
      setDraftMentions({});
      if (composerRef.current) composerRef.current.style.height = '';
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo enviar el comentario. Revisa tu conexión.');
    } finally {
      setSending(false);
    }
  };

  const startEdit = (comment) => {
    const { text, map } = fromMarkup(comment.content);
    setEditingId(comment.id);
    setEditDraft(text);
    setEditMentions(map);
    setError('');
  };

  const handleSaveEdit = async () => {
    const content = toMarkup(editDraft, editMentions).trim();
    if (!content || savingEdit) return;
    setSavingEdit(true);
    try {
      const response = await commentService.update(taskId, editingId, content);
      setComments((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...response.data } : c)));
      setEditingId(null);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar el comentario.');
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = (comment) => {
    setDeleteAuthor(comment.userId === user?.id ? '' : comment.author?.name || '');
    setToDelete(comment);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await commentService.remove(taskId, toDelete.id);
      const next = comments.filter((c) => c.id !== toDelete.id);
      setComments(next);
      onCountChange?.(next.length);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo eliminar el comentario.');
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  // Ctrl/Cmd + Enter envía. Se detiene aquí para que no guarde también el formulario de la tarea.
  const handleShortcut = (e, action) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
      action();
    }
  };

  return (
    <div className="task-comments">
      <div className="comments-header">
        <span className="comments-title"><FiMessageSquare size={14} /> Comentarios</span>
        {comments.length > 0 && <span className="comments-count">{comments.length}</span>}
      </div>

      {loading ? (
        <div className="text-center py-2"><Spinner animation="border" size="sm" /></div>
      ) : loadError ? (
        <div className="comments-error">
          <FiAlertCircle size={14} /> No se pudieron cargar los comentarios.
          <button type="button" className="btn btn-link btn-sm p-0 ms-1" onClick={() => load()}>Reintentar</button>
        </div>
      ) : (
        <>
          {comments.length === 0 && (
            <p className="comments-empty">
              {canComment
                ? 'Aún no hay comentarios. Úsalos para avisar avances, bloqueos o dejar enlaces.'
                : 'Esta tarea no tiene comentarios.'}
            </p>
          )}

          {comments.length > 0 && (
            <ul className="comments-list">
              {comments.map((comment) => {
                const isMine = comment.userId === user?.id;
                const authorName = comment.author?.name || 'Usuario eliminado';
                return (
                  <li key={comment.id} className={`comment-item ${isMine ? 'is-mine' : ''}`}>
                    <span className="comment-avatar" aria-hidden="true">{authorName.charAt(0).toUpperCase()}</span>
                    <div className="comment-body">
                      <div className="comment-meta">
                        <strong>{authorName}</strong>
                        <span title={formatDateTime(comment.createdAt)}>{humanizeDate(comment.createdAt)}</span>
                        {comment.editedAt && <span title={`Editado ${formatDateTime(comment.editedAt)}`}>· editado</span>}
                        {editingId !== comment.id && (isMine || canModerate) && (
                          <span className="comment-actions">
                            {isMine && (
                              <button type="button" className="comment-action" onClick={() => startEdit(comment)} title="Editar" aria-label="Editar comentario">
                                <FiEdit2 size={12} />
                              </button>
                            )}
                            <button type="button" className="comment-action is-danger" onClick={() => confirmDelete(comment)} title="Eliminar" aria-label="Eliminar comentario">
                              <FiTrash2 size={12} />
                            </button>
                          </span>
                        )}
                      </div>

                      {editingId === comment.id ? (
                        <div className="comment-edit">
                          <MentionTextarea
                            rows={2}
                            value={editDraft}
                            maxLength={MAX_LENGTH}
                            onChange={setEditDraft}
                            mentions={editMentions}
                            onMentionsChange={setEditMentions}
                            members={mentionable.members}
                            inviteUrl={inviteUrl}
                            onKeyDown={(e) => handleShortcut(e, handleSaveEdit)}
                            onInput={(e) => autosize(e.target)}
                            autoFocus
                            aria-label="Editar comentario"
                          />
                          <div className="d-flex gap-2 justify-content-end mt-1">
                            <Button type="button" size="sm" variant="outline-secondary" onClick={() => setEditingId(null)} disabled={savingEdit}>
                              Cancelar
                            </Button>
                            <Button type="button" size="sm" variant="primary" onClick={handleSaveEdit} disabled={!editDraft.trim() || savingEdit}>
                              {savingEdit ? <Spinner animation="border" size="sm" /> : 'Guardar'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <CommentText text={comment.content} currentUserId={user?.id} className="comment-content" />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {error && <div className="comments-error mt-2"><FiAlertCircle size={14} /> {error}</div>}

      {canComment && !loading && !loadError && (
        <div className="comment-composer">
          <MentionTextarea
            textareaRef={composerRef}
            rows={2}
            placeholder={mentionable.members.length > 1
              ? 'Escribe un comentario… usa @ para mencionar a alguien del tablero'
              : 'Escribe un comentario: avances, bloqueos o enlaces…'}
            value={draft}
            maxLength={MAX_LENGTH}
            onChange={updateDraft}
            mentions={draftMentions}
            onMentionsChange={setDraftMentions}
            members={mentionable.members.filter((m) => m.id !== user?.id)}
            inviteUrl={inviteUrl}
            onKeyDown={(e) => handleShortcut(e, handleSend)}
            onInput={(e) => autosize(e.target)}
            disabled={sending}
            aria-label="Nuevo comentario"
          />
          <div className="comment-composer-footer">
            <small className="text-muted d-none d-md-inline">
              <kbd>{isMac ? '⌘' : 'Ctrl'}</kbd> + <kbd>Enter</kbd> para enviar
              {draft.length > MAX_LENGTH - 200 && ` · ${draft.length}/${MAX_LENGTH}`}
            </small>
            <Button type="button" size="sm" variant="primary" className="ms-auto comment-send" onClick={handleSend} disabled={!draft.trim() || sending}>
              {sending ? <Spinner animation="border" size="sm" /> : <><FiSend size={13} className="me-1" />Comentar</>}
            </Button>
          </div>
        </div>
      )}

      <ConfirmModal
        show={!!toDelete}
        onHide={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar comentario"
        message={deleteAuthor ? `¿Eliminar el comentario de ${deleteAuthor}? Esta acción no se puede deshacer.` : '¿Eliminar tu comentario? Esta acción no se puede deshacer.'}
        confirmText="Eliminar"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};

export default TaskComments;
