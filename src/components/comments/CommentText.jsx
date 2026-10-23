import { MENTION_PATTERN } from '../../utils/mentions';

/**
 * Texto de un comentario: respeta los saltos de línea, muestra las @menciones resaltadas
 * y convierte los enlaces (http/https y www.) en clicables.
 * Todo se arma con elementos de React (nunca HTML crudo): el texto del usuario no puede inyectar nada.
 */
const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
// Puntuación final que casi siempre es parte de la frase, no del enlace: "ver https://x.com/a."
const TRAILING = /[.,;:!?)\]}'"»]+$/;

const linkify = (text, keyPrefix) => text.split(URL_PATTERN).flatMap((part, i) => {
  if (i % 2 === 0) return [part];
  const trailing = part.match(TRAILING)?.[0] || '';
  const url = trailing ? part.slice(0, -trailing.length) : part;
  const href = url.toLowerCase().startsWith('www.') ? `https://${url}` : url;
  return [
    <a key={`${keyPrefix}-${i}`} href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
      {url}
    </a>,
    trailing
  ];
});

const CommentText = ({ text = '', currentUserId, className }) => {
  const parts = [];
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(MENTION_PATTERN)) {
    parts.push(...linkify(text.slice(last, match.index), `t${index}`));
    const [, name, id] = match;
    parts.push(
      <span key={`m${index}`} className={`comment-mention ${id === currentUserId ? 'is-me' : ''}`}>@{name}</span>
    );
    last = match.index + match[0].length;
    index += 1;
  }
  parts.push(...linkify(text.slice(last), 'end'));
  return <span className={className}>{parts}</span>;
};

export default CommentText;
