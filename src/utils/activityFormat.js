import { formatDate } from './dateUtils';
import { formatFileSize } from './fileUtils';

/**
 * Convierte un evento del historial en una frase legible:
 * "movió la tarea de En progreso → En revisión".
 */
const STATUS = { BACKLOG: 'Backlog', PENDING: 'Por hacer', IN_PROGRESS: 'En progreso', IN_REVIEW: 'En revisión', COMPLETED: 'Completada' };
const PRIORITY = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta' };
const ROLE = { OWNER: 'Propietario', ADMIN: 'Administrador', MEMBER: 'Miembro', VIEWER: 'Observador' };
const FIELD = { title: 'el título', description: 'la descripción', priority: 'la prioridad', dueDate: 'la fecha', category: 'la categoría', name: 'el nombre', color: 'el color' };

const value = (field, v) => {
  if (v === null || v === undefined || v === '') return '(vacío)';
  if (field === 'status') return STATUS[v] || v;
  if (field === 'priority') return PRIORITY[v] || v;
  if (field === 'role') return ROLE[v] || v;
  if (field === 'dueDate') return formatDate(v);
  if (field === 'description') return v.length > 60 ? `"${v.slice(0, 57)}…"` : `"${v}"`;
  if (field === 'title' || field === 'name') return `"${v}"`;
  return v;
};

const wipText = (limits) => {
  const entries = Object.entries(limits || {});
  return entries.length ? entries.map(([s, n]) => `${STATUS[s] || s} ${n}`).join(', ') : 'sin límites';
};

/** Grupos para el filtro "Tipo de evento" (deben coincidir con la API) */
export const ACTIVITY_GROUPS = [
  { value: '', label: 'Todos los eventos' },
  { value: 'status', label: 'Cambios de estado' },
  { value: 'assignment', label: 'Asignaciones y colaboradores' },
  { value: 'edit', label: 'Creación y ediciones' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'attachments', label: 'Archivos' },
  { value: 'comments', label: 'Comentarios' },
  { value: 'deleted', label: 'Tareas eliminadas' },
  { value: 'board', label: 'Tablero (miembros, categorías, WIP)' }
];

/**
 * @returns {{ text: string, tone: string, details?: string[] }}
 *   text: frase principal; details: líneas de cambios; tone: color del punto en la línea de tiempo
 */
export const describeActivity = (entry) => {
  const c = entry.changes || [];
  const d = entry.details || {};

  switch (entry.action) {
    case 'TASK_CREATED':
      return {
        tone: 'create',
        text: `creó la tarea${d.status ? ` en ${STATUS[d.status] || d.status}` : ''}${d.assignee ? ` asignada a ${d.assignee}` : ''}`,
        details: d.reconstructed ? ['Registro reconstruido de la fecha de creación'] : null
      };
    case 'TASK_STATUS_CHANGED':
      return {
        tone: c[0]?.to === 'COMPLETED' ? 'done' : d.note ? 'warn' : 'status',
        text: `movió la tarea de ${value('status', c[0]?.from)} → ${value('status', c[0]?.to)}`,
        details: d.note ? [d.note] : null
      };
    case 'TASK_ASSIGNED':
      if (!c[0]?.to) return { tone: 'assign', text: `quitó la asignación a ${c[0]?.from}` };
      return { tone: 'assign', text: c[0]?.from ? `reasignó la tarea de ${c[0].from} → ${c[0].to}` : `asignó la tarea a ${c[0].to}` };
    case 'TASK_UPDATED':
      return {
        tone: 'edit',
        text: c.length === 1 ? `cambió ${FIELD[c[0].field] || c[0].field}` : `editó ${c.length} campos`,
        details: c.map(ch => `${(FIELD[ch.field] || ch.field).replace(/^(el|la) /, '')}: ${value(ch.field, ch.from)} → ${value(ch.field, ch.to)}`)
      };
    case 'TASK_DELETED':
      return { tone: 'danger', text: 'eliminó la tarea', details: d.status ? [`Estaba en ${STATUS[d.status] || d.status}`] : null };
    case 'CHECKLIST_ITEM_ADDED':
      return { tone: 'edit', text: `agregó a la checklist "${d.content}"`, details: d.progress ? [`Avance ${d.progress}`] : null };
    case 'CHECKLIST_ITEM_COMPLETED':
      return { tone: 'done', text: `completó "${d.content}"`, details: d.progress ? [`Avance ${d.progress}`] : null };
    case 'CHECKLIST_ITEM_REOPENED':
      return { tone: 'warn', text: `desmarcó "${d.content}"`, details: d.progress ? [`Avance ${d.progress}`] : null };
    case 'CHECKLIST_ITEM_DELETED':
      return { tone: 'danger', text: `quitó de la checklist "${d.content}"` };
    case 'ATTACHMENT_ADDED':
      return { tone: 'edit', text: `adjuntó "${d.fileName}"`, details: d.sizeBytes ? [formatFileSize(d.sizeBytes)] : null };
    case 'ATTACHMENT_DELETED':
      return { tone: 'danger', text: `eliminó el archivo "${d.fileName}"` };
    case 'COLLABORATOR_ADDED':
      return { tone: 'assign', text: `agregó a colaborar a ${(d.names || []).join(', ')}` };
    case 'COLLABORATOR_REMOVED':
      return { tone: 'assign', text: `quitó de colaboradores a ${(d.names || []).join(', ')}` };
    case 'COMMENT_ADDED':
      return { tone: 'edit', text: 'comentó', details: d.content ? [`"${d.content}"`] : null };
    case 'COMMENT_DELETED':
      return { tone: 'danger', text: d.author ? `eliminó un comentario de ${d.author}` : 'eliminó un comentario', details: d.content ? [`"${d.content}"`] : null };
    case 'CATEGORY_CREATED':
      return { tone: 'board', text: `creó la categoría "${d.name}"` };
    case 'CATEGORY_UPDATED':
      return { tone: 'board', text: `editó la categoría "${d.name}"`, details: c.map(ch => `${(FIELD[ch.field] || ch.field).replace(/^(el|la) /, '')}: ${value(ch.field, ch.from)} → ${value(ch.field, ch.to)}`) };
    case 'CATEGORY_DELETED':
      return { tone: 'danger', text: `eliminó la categoría "${d.name}"`, details: d.taskCount ? [`${d.taskCount} tareas quedaron sin categoría`] : null };
    case 'MEMBER_ADDED':
      return { tone: 'board', text: `agregó a ${d.member} como ${value('role', d.role)}` };
    case 'MEMBER_REMOVED':
      return { tone: 'danger', text: `quitó a ${d.member} del tablero` };
    case 'MEMBER_ROLE_CHANGED':
      return { tone: 'board', text: `cambió el rol de ${d.member}: ${value('role', c[0]?.from)} → ${value('role', c[0]?.to)}` };
    case 'WIP_LIMITS_CHANGED':
      return { tone: 'board', text: 'cambió los límites WIP', details: [`${wipText(c[0]?.from)} → ${wipText(c[0]?.to)}`] };
    case 'WORKSPACE_CREATED':
      return { tone: 'create', text: 'creó el tablero' };
    case 'WORKSPACE_UPDATED':
      return { tone: 'board', text: 'editó el tablero', details: c.map(ch => `${(FIELD[ch.field] || ch.field).replace(/^(el|la) /, '')}: ${value(ch.field, ch.from)} → ${value(ch.field, ch.to)}`) };
    case 'WORKSPACE_DELETED':
      return { tone: 'danger', text: 'eliminó el tablero' };
    default:
      return { tone: 'edit', text: entry.action };
  }
};
