import { useState, useRef } from 'react';
import { Modal, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { FiCheckSquare, FiEdit2, FiClock, FiLoader, FiCheckCircle, FiPlus, FiTrash2, FiInbox, FiEye, FiX, FiUsers } from 'react-icons/fi';
import taskService from '../../services/taskService';
import checklistService from '../../services/checklistService';
import TaskChecklist from './TaskChecklist';
import CategoryForm from '../categories/CategoryForm';
import TaskReference from './TaskReference';
import TaskActivity from '../activity/TaskActivity';
import ConfirmModal from '../common/ConfirmModal';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import attachmentService from '../../services/attachmentService';
import TaskAttachments from '../attachments/TaskAttachments';
import PendingAttachments from '../attachments/PendingAttachments';
import TaskComments from '../comments/TaskComments';
import './TaskChecklist.css';

const EMPTY_FORM = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'pending',
  dueDate: '',
  categoryId: '',
  assignedTo: '',
  collaboratorIds: []
};

const PRIORITIES = [
  { value: 'low', label: 'Baja', color: '#198754' },
  { value: 'medium', label: 'Media', color: '#ffc107' },
  { value: 'high', label: 'Alta', color: '#dc3545' }
];

const STATUSES = [
  { value: 'backlog', label: 'Backlog', color: '#94a3b8', icon: FiInbox },
  { value: 'pending', label: 'Por hacer', color: '#ffc107', icon: FiClock },
  { value: 'in_progress', label: 'En progreso', color: '#0dcaf0', icon: FiLoader },
  { value: 'in_review', label: 'En revisión', color: '#8b5cf6', icon: FiEye },
  { value: 'completed', label: 'Completada', color: '#198754', icon: FiCheckCircle }
];

// Nombre visible de cada campo (errores del servidor que no tienen lugar en el formulario)
const FIELD_LABELS = {
  title: 'Título',
  description: 'Descripción',
  priority: 'Prioridad',
  status: 'Estado',
  dueDate: 'Fecha límite',
  categoryId: 'Categoría',
  assignedTo: 'Asignar a'
};
const INLINE_FIELDS = ['title', 'description', 'dueDate', 'categoryId'];

/** Fecha local como YYYY-MM-DD (lo que usa <input type="date">), desplazada `days` días desde hoy */
const localDate = (days = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const QUICK_DATES = [
  { label: 'Hoy', days: 0 },
  { label: 'Mañana', days: 1 },
  { label: 'En una semana', days: 7 }
];

// Última categoría usada al crear, por tablero (solo comodidad: si el navegador no deja guardar, no pasa nada)
const lastCategoryKey = (workspaceId) => `tasker:lastCategory:${workspaceId || 'personal'}`;
const readLastCategory = (workspaceId) => {
  try { return localStorage.getItem(lastCategoryKey(workspaceId)); } catch { return null; }
};
const saveLastCategory = (workspaceId, categoryId) => {
  try { localStorage.setItem(lastCategoryKey(workspaceId), categoryId); } catch { /* sin almacenamiento */ }
};

const DESCRIPTION_MAX_HEIGHT = 320;
const autosize = (el) => {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight + 2, DESCRIPTION_MAX_HEIGHT)}px`;
};

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

const TaskForm = ({ show, onHide, onTaskCreated, onTaskUpdated, taskToEdit, categories = [], workspaceId, workspaceMembers = [], onWarning, onAttachmentsChange, workspace }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const titleRef = useRef(null);
  const descRef = useRef(null);
  const formRef = useRef(null);
  // Valores con los que se abrió el formulario: sirven para saber si hay cambios sin guardar
  const [initial, setInitial] = useState(EMPTY_FORM);

  // Solo OWNER/ADMIN del tablero pueden crear categorías (la API lo valida).
  // `workspace` permite abrir una tarea de otro tablero (ej. desde Mis tareas); si no, el tablero actual.
  const { currentWorkspace: activeWorkspace } = useWorkspace();
  const currentWorkspace = workspace || activeWorkspace;
  const canManageCategories = ['OWNER', 'ADMIN'].includes(currentWorkspace?.myRole);

  // Adjuntos: borra quien lo subió, quien creó la tarea u OWNER/ADMIN (misma regla que la API)
  const { user } = useAuth();
  const isManager = currentWorkspace?.isPersonal || canManageCategories;
  const canDeleteAttachment = (attachment) =>
    isManager || attachment.uploader?.id === user?.id || taskToEdit?.userId === user?.id;

  // Archivos elegidos al crear (se suben después de crear la tarea)
  const [pendingFiles, setPendingFiles] = useState([]);
  // Hay un comentario escrito sin enviar (para avisar antes de cerrar)
  const [commentDraft, setCommentDraft] = useState(false);

  // Categorías del tablero + las creadas desde el form (se puede agregar una nueva sin cerrar el form)
  const [createdCategories, setCreatedCategories] = useState([]);
  const localCategories = [...categories, ...createdCategories.filter((c) => !categories.some((x) => x.id === c.id))];
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Checklist draft (solo para nueva tarea)
  const [draftChecklistItems, setDraftChecklistItems] = useState([]);
  const [newChecklistContent, setNewChecklistContent] = useState('');

  const isEditing = !!taskToEdit;

  // Un observador no puede tener tareas asignadas (no puede modificarlas). Se muestra igual si ya lo estaba.
  // Quien usa el formulario va primero, para asignarse rápido.
  const assignableMembers = workspaceMembers
    .filter((m) => m.role !== 'VIEWER' || m.userId === formData.assignedTo)
    .sort((a, b) => (b.userId === user?.id) - (a.userId === user?.id));

  // Nueva tarea: la última categoría usada en este tablero, o la única que exista
  const presetCategory = () => {
    const last = readLastCategory(workspaceId);
    return localCategories.find((c) => c.id === last)?.id
      || (localCategories.length === 1 ? localCategories[0].id : '');
  };

  // Al abrir: cargar la tarea o dejar el formulario en blanco.
  // Se ajusta el estado durante el render (patrón recomendado por React en vez de un efecto).
  const [openedFor, setOpenedFor] = useState({ show: false, task: null });
  const [presetPending, setPresetPending] = useState(false);
  if (openedFor.show !== show || openedFor.task !== taskToEdit) {
    setOpenedFor({ show, task: taskToEdit });
    if (show) {
      const data = taskToEdit
        ? {
          title: taskToEdit.title || '',
          description: taskToEdit.description || '',
          priority: taskToEdit.priority || 'medium',
          status: taskToEdit.status || 'pending',
          dueDate: taskToEdit.dueDate ? taskToEdit.dueDate.split('T')[0] : '',
          categoryId: taskToEdit.categoryId || '',
          assignedTo: taskToEdit.assignedTo || '',
          collaboratorIds: (taskToEdit.collaborators || []).map((c) => c.id)
        }
        : { ...EMPTY_FORM, categoryId: presetCategory() };
      setFormData(data);
      setInitial(data);
      // Si las categorías todavía no llegan, se preselecciona cuando lleguen
      setPresetPending(!taskToEdit && !data.categoryId);
      setError('');
      setFieldErrors({});
      setDraftChecklistItems([]);
      setNewChecklistContent('');
      setPendingFiles([]);
      setCommentDraft(false);
    }
  }
  if (presetPending && show && localCategories.length > 0) {
    setPresetPending(false);
    const preset = presetCategory();
    if (preset && !formData.categoryId) {
      setFormData((prev) => ({ ...prev, categoryId: preset }));
      setInitial((prev) => ({ ...prev, categoryId: preset }));
    }
  }

  const sameIds = (a = [], b = []) => a.length === b.length && a.every((id) => b.includes(id));
  const formChanged = Object.keys(EMPTY_FORM).some((key) => (key === 'collaboratorIds'
    ? !sameIds(formData[key], initial[key])
    : formData[key] !== initial[key]));
  const hasUnsavedWork = formChanged
    || draftChecklistItems.length > 0
    || newChecklistContent.trim().length > 0
    || pendingFiles.length > 0
    || commentDraft;

  const clearFieldError = (name) => {
    if (!fieldErrors[name]) return;
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const setField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name);
  };

  const handleChange = (e) => setField(e.target.name, e.target.value);

  // Asignar a alguien que era colaborador lo quita de colaboradores (no se repite)
  const handleAssigneeChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      assignedTo: value,
      collaboratorIds: prev.collaboratorIds.filter((id) => id !== value)
    }));
  };

  const addCollaborator = (id) => {
    if (!id) return;
    setFormData((prev) => ({ ...prev, collaboratorIds: [...prev.collaboratorIds, id] }));
  };

  const removeCollaborator = (id) => {
    setFormData((prev) => ({ ...prev, collaboratorIds: prev.collaboratorIds.filter((x) => x !== id) }));
  };

  // Colaboradores posibles: quienes pueden editar (no observadores), sin la persona asignada ni los ya elegidos
  const collaboratorOptions = workspaceMembers.filter((m) => m.role !== 'VIEWER'
    && m.userId !== formData.assignedTo
    && !formData.collaboratorIds.includes(m.userId));
  const memberName = (id) => {
    const member = workspaceMembers.find((m) => m.userId === id);
    return member?.user?.name || taskToEdit?.collaborators?.find((c) => c.id === id)?.name || 'Usuario';
  };

  // Categoría creada desde el form: agregar al dropdown y auto-seleccionar
  const handleInlineCategoryCreated = (newCategory) => {
    const cat = newCategory?.data || newCategory;
    setCreatedCategories((prev) => [...prev, cat]);
    setField('categoryId', cat.id);
    setShowCategoryModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setFieldErrors({});

    // Validación básica frontend
    const frontendErrors = {};
    if (formData.title.trim().length < 3) {
      frontendErrors.title = 'El título debe tener al menos 3 caracteres';
    }
    // Obligatoria solo si el tablero tiene categorías (la API permite tareas sin categoría)
    if (!formData.categoryId && localCategories.length > 0) {
      frontendErrors.categoryId = 'Elige una categoría';
    }
    if (Object.keys(frontendErrors).length > 0) {
      setFieldErrors(frontendErrors);
      if (frontendErrors.title) titleRef.current?.focus();
      return;
    }

    setLoading(true);

    const dataToSend = {
      ...formData,
      title: formData.title.trim(),
      status: formData.status.toUpperCase(),
      priority: formData.priority.toUpperCase(),
      categoryId: formData.categoryId || null,
      dueDate: formData.dueDate || null,
      assignedTo: formData.assignedTo || null,
      collaboratorIds: formData.collaboratorIds,
      workspaceId: workspaceId || null
    };

    try {
      if (isEditing) {
        const response = await taskService.updateTask(taskToEdit.id, dataToSend);
        onTaskUpdated(response.data);
      } else {
        const response = await taskService.createTask(dataToSend);
        const createdTask = response?.data?.data || response?.data;
        const createdTaskId = createdTask?.id;
        saveLastCategory(workspaceId, formData.categoryId);

        let checklistFailedCount = 0;

        // Crear checklist items (si el usuario agregó en el borrador; incluye lo escrito sin presionar +)
        const itemsToCreate = [...draftChecklistItems.map((i) => i.content), newChecklistContent]
          .map((c) => (c || '').trim())
          .filter(Boolean);

        if (createdTaskId && itemsToCreate.length > 0) {
          setLoadingText('Guardando subtareas...');
          for (const content of itemsToCreate) {
            try {
              await checklistService.addItem(createdTaskId, content);
            } catch {
              checklistFailedCount += 1;
            }
          }
        }

        // Subir los archivos elegidos, uno por uno (si uno falla los demás siguen)
        const filesFailed = [];
        if (createdTaskId && pendingFiles.length > 0) {
          for (const [i, file] of pendingFiles.entries()) {
            setLoadingText(`Subiendo archivos ${i + 1}/${pendingFiles.length}...`);
            try {
              await attachmentService.upload(createdTaskId, [file]);
            } catch (err) {
              const reason = err.response?.data?.message || 'error de conexión';
              filesFailed.push(`"${file.name}" (${reason})`);
            }
          }
        }

        // Si pudimos crear checklist o archivos, traer la tarea actualizada (avance y portada)
        let finalResponse = response;
        if (createdTaskId && (itemsToCreate.length > 0 || pendingFiles.length > 0)) {
          try {
            finalResponse = await taskService.getTaskById(createdTaskId);
          } catch {
            // si falla el refetch, mantenemos el response original
          }
        }

        onTaskCreated(finalResponse.data);

        // Un solo aviso con todo lo que falló (si no, el segundo pisa al primero)
        const problems = [];
        if (checklistFailedCount > 0) {
          problems.push(`no se pudieron guardar ${checklistFailedCount} ítem(s) del checklist`);
        }
        if (filesFailed.length > 0) {
          problems.push(`no se pudieron subir ${filesFailed.join(', ')}`);
        }
        if (problems.length > 0 && typeof onWarning === 'function') {
          onWarning(`La tarea se creó, pero ${problems.join('; y ')}. Abre la tarea para intentarlo de nuevo.`);
        }
      }
      onHide();
    } catch (err) {
      const data = err.response?.data;
      setError(data?.message || `No se pudo ${isEditing ? 'guardar' : 'crear'} la tarea. Revisa tu conexión e intenta de nuevo.`);
      if (Array.isArray(data?.errors)) {
        const mapped = {};
        data.errors.forEach((e) => {
          mapped[e.field] = e.message;
        });
        setFieldErrors(mapped);
      }
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  };

  // Cerrar (X, Esc, clic afuera, Cancelar): si hay algo sin guardar se pide confirmación
  const requestClose = () => {
    if (loading) return;
    if (hasUnsavedWork) {
      setConfirmDiscard(true);
      return;
    }
    onHide();
  };

  const discardAndClose = () => {
    setConfirmDiscard(false);
    onHide();
  };

  // Ctrl/Cmd + Enter guarda desde cualquier campo
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  const addDraftChecklistItems = (contents) => {
    const items = contents.map((c) => c.trim()).filter(Boolean);
    if (!items.length) return;
    setDraftChecklistItems((prev) => [
      ...prev,
      ...items.map((content) => ({ id: `${Date.now()}-${Math.random()}`, content }))
    ]);
  };

  const addDraftChecklistItem = () => {
    addDraftChecklistItems([newChecklistContent]);
    setNewChecklistContent('');
  };

  // Pegar una lista (una subtarea por línea) agrega todas de una vez
  const handleChecklistPaste = (e) => {
    const text = e.clipboardData?.getData('text') || '';
    const lines = text.split(/\r?\n/).map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)]|\[[ xX]?\])\s*/, '')).filter((l) => l.trim());
    if (lines.length < 2) return;
    e.preventDefault();
    addDraftChecklistItems(lines);
  };

  const handleRemoveDraftChecklistItem = (id) => {
    setDraftChecklistItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleEntered = () => {
    autosize(descRef.current);
    if (!isEditing) titleRef.current?.focus();
  };

  // Errores del servidor que no se pueden mostrar junto a un campo
  const otherFieldErrors = Object.entries(fieldErrors).filter(([field]) => !INLINE_FIELDS.includes(field));
  const today = localDate();
  const saveDisabled = loading || (isEditing && !formChanged);

  return (
    <>
    {/* Mientras guarda (o sube archivos) no se puede cerrar: al terminar cerraría el modal que esté abierto */}
    <Modal
      show={show}
      onHide={requestClose}
      onEntered={handleEntered}
      centered
      scrollable
      size="lg"
      dialogClassName="task-form-dialog"
      fullscreen="sm-down"
      backdrop={loading ? 'static' : true}
      keyboard={!loading}
      className="task-form-modal"
    >
      <Modal.Header closeButton={!loading} className="border-0 pb-2">
        <Modal.Title className="d-flex align-items-center gap-2 flex-wrap">
          <div className="task-icon-preview">
            {isEditing ? <FiEdit2 /> : <FiCheckSquare />}
          </div>
          {isEditing ? 'Editar tarea' : 'Nueva tarea'}
          {isEditing && <TaskReference number={taskToEdit?.number} title={taskToEdit?.title} />}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-1">
        {error && (
          <Alert variant="danger" className="py-2">
            {error}
            {otherFieldErrors.length > 0 && (
              <ul className="mb-0 mt-1">
                {otherFieldErrors.map(([field, msg]) => (
                  <li key={field}><strong>{FIELD_LABELS[field] || field}:</strong> {msg}</li>
                ))}
              </ul>
            )}
          </Alert>
        )}
        <Form id="task-form" ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate>
          {/* Escritorio: contenido a la izquierda y propiedades en una barra lateral fija. Celular/tablet: una columna */}
          <div className="task-form-layout">
            <div className="task-form-main">
              <Form.Group className="mb-3" controlId="task-title">
                <Form.Label className="task-form-label">Título</Form.Label>
                <Form.Control
                  ref={titleRef}
                  type="text"
                  name="title"
                  placeholder="¿Qué necesitas hacer?"
                  value={formData.title}
                  onChange={handleChange}
                  maxLength={255}
                  isInvalid={!!fieldErrors.title}
                  className="task-form-title"
                  autoComplete="off"
                />
                <Form.Control.Feedback type="invalid">{fieldErrors.title}</Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3" controlId="task-description">
                <Form.Label className="task-form-label">
                  Descripción <span className="task-form-optional">(opcional)</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  ref={descRef}
                  rows={4}
                  name="description"
                  placeholder="Agrega detalles, contexto o criterios de aceptación..."
                  value={formData.description}
                  onChange={(e) => {
                    handleChange(e);
                    autosize(e.target);
                  }}
                  maxLength={1000}
                  isInvalid={!!fieldErrors.description}
                  className="task-form-description"
                />
                <div className="d-flex justify-content-between mt-1">
                  <Form.Control.Feedback type="invalid" className={fieldErrors.description ? 'd-block' : ''}>
                    {fieldErrors.description}
                  </Form.Control.Feedback>
                  {formData.description.length > 800 && (
                    <small className={`ms-auto ${formData.description.length >= 1000 ? 'text-danger' : 'text-muted'}`}>
                      {formData.description.length}/1000
                    </small>
                  )}
                </div>
              </Form.Group>

            </div>

            <aside className="task-form-side" aria-label="Propiedades de la tarea">
              <Form.Group className="mb-3">
                <Form.Label className="task-form-label" id="task-status-label">Estado</Form.Label>
                <div className="status-selector task-form-segmented" role="radiogroup" aria-labelledby="task-status-label">
                  {STATUSES.map((status) => {
                    const IconComponent = status.icon;
                    const selected = formData.status === status.value;
                    return (
                      <button
                        key={status.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`status-option ${selected ? 'selected' : ''}`}
                        style={{ '--status-color': status.color }}
                        onClick={() => setField('status', status.value)}
                      >
                        <IconComponent size={14} style={{ color: status.color }} />
                        {status.label}
                      </button>
                    );
                  })}
                </div>
              </Form.Group>

              <Row className="g-3 mb-3">
                <Col md={6} lg={12}>
                  <Form.Label className="task-form-label" id="task-priority-label">Prioridad</Form.Label>
                  <div className="priority-selector task-form-segmented" role="radiogroup" aria-labelledby="task-priority-label">
                    {PRIORITIES.map((priority) => {
                      const selected = formData.priority === priority.value;
                      return (
                        <button
                          key={priority.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          className={`priority-option ${selected ? 'selected' : ''}`}
                          style={{ '--priority-color': priority.color }}
                          onClick={() => setField('priority', priority.value)}
                        >
                          <span className="priority-dot" style={{ backgroundColor: priority.color }} />
                          {priority.label}
                        </button>
                      );
                    })}
                  </div>
                </Col>

                <Col md={6} lg={12}>
                  <Form.Group controlId="task-due-date">
                    <Form.Label className="task-form-label">
                      Fecha límite <span className="task-form-optional">(opcional)</span>
                    </Form.Label>
                    <div className="d-flex gap-2">
                      <Form.Control
                        type="date"
                        name="dueDate"
                        value={formData.dueDate}
                        onChange={handleChange}
                        min={isEditing ? undefined : today}
                        isInvalid={!!fieldErrors.dueDate}
                      />
                      {formData.dueDate && (
                        <Button
                          variant="outline-secondary"
                          className="flex-shrink-0 px-2"
                          onClick={() => setField('dueDate', '')}
                          title="Quitar fecha"
                          aria-label="Quitar fecha"
                        >
                          <FiX />
                        </Button>
                      )}
                    </div>
                    <div className="task-form-chips">
                      {QUICK_DATES.map(({ label, days }) => {
                        const value = localDate(days);
                        return (
                          <button
                            key={label}
                            type="button"
                            className={`task-form-chip ${formData.dueDate === value ? 'selected' : ''}`}
                            onClick={() => setField('dueDate', value)}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <Form.Control.Feedback type="invalid" className={fieldErrors.dueDate ? 'd-block' : ''}>
                      {fieldErrors.dueDate}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>

                <Col md={6} lg={12}>
                  <Form.Group controlId="task-category">
                    <div className="d-flex justify-content-between align-items-center">
                      <Form.Label className="task-form-label">Categoría</Form.Label>
                      {canManageCategories && (
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 mb-2 text-decoration-none task-form-link"
                          onClick={() => setShowCategoryModal(true)}
                        >
                          <FiPlus size={12} className="me-1" />
                          Nueva categoría
                        </button>
                      )}
                    </div>
                    <Form.Select
                      name="categoryId"
                      value={formData.categoryId}
                      onChange={handleChange}
                      isInvalid={!!fieldErrors.categoryId}
                      disabled={localCategories.length === 0}
                    >
                      <option value="">{localCategories.length === 0 ? 'Este tablero no tiene categorías' : 'Elige una categoría'}</option>
                      {localCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">{fieldErrors.categoryId}</Form.Control.Feedback>
                  </Form.Group>
                </Col>

                {workspaceMembers.length > 1 && (
                  <Col md={6} lg={12}>
                    <Form.Group controlId="task-assignee">
                      <div className="d-flex justify-content-between align-items-center">
                        <Form.Label className="task-form-label">Asignar a</Form.Label>
                        {user?.id && formData.assignedTo !== user.id && assignableMembers.some((m) => m.userId === user.id) && (
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 mb-2 text-decoration-none task-form-link"
                            onClick={() => setField('assignedTo', user.id)}
                          >
                            Asignármela
                          </button>
                        )}
                      </div>
                      <Form.Select name="assignedTo" value={formData.assignedTo} onChange={(e) => handleAssigneeChange(e.target.value)}>
                        <option value="">Sin asignar</option>
                        {assignableMembers.map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.user?.name || member.user?.email}{member.userId === user?.id ? ' (yo)' : ''}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                )}

                {workspaceMembers.length > 1 && (
                  <Col xs={12}>
                    <Form.Label className="task-form-label" htmlFor="task-collaborator-add">
                      <FiUsers size={13} className="me-1" />
                      Colaboradores <span className="task-form-optional">(opcional · pueden editar la tarea igual que la persona asignada)</span>
                    </Form.Label>
                    <div className="task-collaborators">
                      {formData.collaboratorIds.map((id) => (
                        <span key={id} className="task-collaborator-chip">
                          <span className="task-collaborator-avatar">{memberName(id).charAt(0).toUpperCase()}</span>
                          {memberName(id)}{id === user?.id ? ' (yo)' : ''}
                          <button type="button" onClick={() => removeCollaborator(id)} aria-label={`Quitar a ${memberName(id)}`}>
                            <FiX size={12} />
                          </button>
                        </span>
                      ))}
                      {collaboratorOptions.length > 0 && (
                        <Form.Select
                          id="task-collaborator-add"
                          size="sm"
                          className="task-collaborator-add"
                          value=""
                          onChange={(e) => addCollaborator(e.target.value)}
                        >
                          <option value="">+ Agregar colaborador</option>
                          {collaboratorOptions.map((member) => (
                            <option key={member.userId} value={member.userId}>
                              {member.user?.name || member.user?.email}{member.userId === user?.id ? ' (yo)' : ''}
                            </option>
                          ))}
                        </Form.Select>
                      )}
                    </div>
                  </Col>
                )}
              </Row>
            </aside>

            <div className="task-form-extra">

              {!isEditing && (
                <div className="task-checklist mt-3">
                  <div className="checklist-header">
                    <span className="checklist-title">Subtareas <span className="task-form-optional">(opcional)</span></span>
                    {draftChecklistItems.length > 0 && (
                      <span className="checklist-count">{draftChecklistItems.length}</span>
                    )}
                  </div>

                  {draftChecklistItems.length > 0 && (
                    <div className="checklist-items">
                      {draftChecklistItems.map((item) => (
                        <div key={item.id} className="checklist-item">
                          <span className="checklist-item-text">{item.content}</span>
                          <button
                            type="button"
                            className="checklist-delete-btn"
                            onClick={() => handleRemoveDraftChecklistItem(item.id)}
                            title="Quitar"
                            aria-label={`Quitar "${item.content}"`}
                          >
                            <FiTrash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="checklist-add-form">
                    <Form.Control
                      type="text"
                      size="sm"
                      placeholder="Escribe una subtarea y presiona Enter (o pega una lista)"
                      aria-label="Nueva subtarea"
                      value={newChecklistContent}
                      onChange={(e) => setNewChecklistContent(e.target.value)}
                      onPaste={handleChecklistPaste}
                      onKeyDown={(e) => {
                        // Enter agrega la subtarea (no envía el formulario); Ctrl/Cmd+Enter sí guarda
                        if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                          e.preventDefault();
                          e.stopPropagation();
                          addDraftChecklistItem();
                        }
                      }}
                      maxLength={500}
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline-primary"
                      disabled={!newChecklistContent.trim() || loading}
                      className="checklist-add-btn"
                      onClick={addDraftChecklistItem}
                      aria-label="Agregar subtarea"
                    >
                      <FiPlus size={14} />
                    </Button>
                  </div>
                </div>
              )}

              {isEditing && taskToEdit?.id && (
                <TaskChecklist taskId={taskToEdit.id} />
              )}

              {isEditing && taskToEdit?.id ? (
                <TaskAttachments
                  key={`files-${taskToEdit.id}`}
                  taskId={taskToEdit.id}
                  canUpload
                  canDelete={canDeleteAttachment}
                  onSummaryChange={(summary) => onAttachmentsChange?.(taskToEdit.id, summary)}
                />
              ) : (
                <PendingAttachments files={pendingFiles} onChange={setPendingFiles} disabled={loading} />
              )}

              {isEditing && taskToEdit?.id && (
                <TaskComments
                  key={`comments-${taskToEdit.id}`}
                  taskId={taskToEdit.id}
                  canModerate={isManager}
                  onCountChange={(commentCount) => onAttachmentsChange?.(taskToEdit.id, { commentCount })}
                  onDraftChange={setCommentDraft}
                />
              )}

              {isEditing && taskToEdit?.id && (
                <TaskActivity key={taskToEdit.id} taskId={taskToEdit.id} />
              )}
            </div>
          </div>
        </Form>
      </Modal.Body>

      {/* Fuera del cuerpo con scroll: los botones siempre están a la vista */}
      <Modal.Footer className="task-form-footer">
        <small className="task-form-hint d-none d-md-inline">
          {isEditing
            ? 'Subtareas, archivos y comentarios se guardan al instante'
            : <><kbd>{isMac ? '⌘' : 'Ctrl'}</kbd> + <kbd>Enter</kbd> para crear</>}
        </small>
        <div className="d-flex gap-2 ms-auto task-form-actions">
          <Button variant="outline-secondary" type="button" disabled={loading} onClick={requestClose}>
            {isEditing && !formChanged ? 'Cerrar' : 'Cancelar'}
          </Button>
          <Button variant="primary" type="submit" form="task-form" disabled={saveDisabled} className="btn-create-task">
            {loading ? (
              <>
                <Spinner animation="border" size="sm" />
                {loadingText || (isEditing ? 'Guardando...' : 'Creando...')}
              </>
            ) : (
              <>
                {isEditing ? <FiEdit2 /> : <FiCheckSquare />}
                {isEditing ? (formChanged ? 'Guardar cambios' : 'Sin cambios') : 'Crear tarea'}
              </>
            )}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>

    <ConfirmModal
      show={confirmDiscard}
      onHide={() => setConfirmDiscard(false)}
      onConfirm={discardAndClose}
      title="¿Descartar cambios?"
      message={isEditing ? 'Los cambios que hiciste en la tarea no se guardarán.' : 'La tarea que estabas escribiendo no se guardará.'}
      confirmText="Descartar"
      cancelText="Seguir editando"
      variant="warning"
    />

    <CategoryForm
      show={showCategoryModal}
      onHide={() => setShowCategoryModal(false)}
      onCategoryCreated={handleInlineCategoryCreated}
      workspaceId={workspaceId}
    />
    </>
  );
};

export default TaskForm;
