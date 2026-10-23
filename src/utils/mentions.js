/**
 * Menciones en comentarios. En la API se guardan como @[Nombre](id); en el cuadro de texto
 * la persona ve "@Nombre" y aquí se convierte de un formato al otro.
 */
export const MENTION_PATTERN = /@\[([^\]\n]{1,100})\]\(([0-9a-f-]{36})\)/gi;

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Quita acentos y pasa a minúsculas (para buscar "sofia" y encontrar "Sofía") */
export const normalize = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Texto del cuadro → contenido para la API.
 * @param {string} text - "Hola @Sofía Herrera"
 * @param {object} map  - { 'Sofía Herrera': 'uuid' } (personas elegidas de la lista)
 */
export const toMarkup = (text, map) => Object.entries(map)
  .sort(([a], [b]) => b.length - a.length)
  .reduce((acc, [name, id]) => acc.replace(
    new RegExp(`@${escapeRegExp(name)}(?![\\p{L}\\p{N}])`, 'gu'),
    `@[${name}](${id})`
  ), text);

/** Contenido de la API → { text, map } para editarlo en el cuadro */
export const fromMarkup = (content = '') => {
  const map = {};
  const text = content.replace(MENTION_PATTERN, (_, name, id) => {
    map[name] = id;
    return `@${name}`;
  });
  return { text, map };
};
