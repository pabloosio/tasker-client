/**
 * Humaniza una fecha relativa al momento actual
 * @param {string|Date} date - Fecha a humanizar
 * @returns {string} - Texto humanizado
 */
export const humanizeDate = (date) => {
  if (!date) return null;

  const now = new Date();
  const target = new Date(date);
  const diffMs = now - target;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  // Futuro
  if (diffMs < 0) {
    const futureDays = Math.abs(diffDays);
    if (futureDays === 0) return 'Hoy';
    if (futureDays === 1) return 'Mañana';
    if (futureDays < 7) return `En ${futureDays} días`;
    if (futureDays < 30) return `En ${Math.ceil(futureDays / 7)} semanas`;
    return formatDate(target);
  }

  // Pasado
  if (diffSecs < 60) return 'Hace un momento';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffWeeks < 4) return `Hace ${diffWeeks} sem`;
  if (diffMonths < 12) return `Hace ${diffMonths} meses`;

  return formatDate(target);
};

/**
 * Formatea fecha corta: "12 Ene" o "12 Ene 2025"
 */
export const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();

  const options = { day: 'numeric', month: 'short' };
  if (!sameYear) options.year = 'numeric';

  return d.toLocaleDateString('es-ES', options);
};

/**
 * Formatea fecha y hora: "12 Ene, 14:30"
 */
export const formatDateTime = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();

  const dateOpts = { day: 'numeric', month: 'short' };
  if (!sameYear) dateOpts.year = 'numeric';

  const timeOpts = { hour: '2-digit', minute: '2-digit', hour12: false };

  const dateStr = d.toLocaleDateString('es-ES', dateOpts);
  const timeStr = d.toLocaleTimeString('es-ES', timeOpts);

  return `${dateStr}, ${timeStr}`;
};
