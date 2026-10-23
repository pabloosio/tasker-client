/**
 * Identificador legible de una tarea: #000142.
 * Si cambia el formato, cambiar aquí y en tasker-api/src/utils/taskKey.js.
 */
const TASK_KEY_DIGITS = 6;

export const formatTaskKey = (number) =>
  number ? `#${String(number).padStart(TASK_KEY_DIGITS, '0')}` : '';

/** "142", "#142" o "#000142" → 142. Devuelve null si no es un ID. */
export const parseTaskKey = (value) => {
  const match = String(value ?? '').trim().match(/^#?0*(\d{1,9})$/);
  const number = match ? parseInt(match[1], 10) : NaN;
  return number > 0 ? number : null;
};

/** Enlace directo para compartir: https://…/t/000142 */
export const taskLink = (number) =>
  `${window.location.origin}/t/${formatTaskKey(number).slice(1)}`;
