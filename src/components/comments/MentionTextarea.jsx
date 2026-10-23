import { useState, useRef } from 'react';
import { Form } from 'react-bootstrap';
import { normalize } from '../../utils/mentions';

const MAX_SUGGESTIONS = 6;
const ROLE_LABEL = { OWNER: 'Propietario', ADMIN: 'Administrador', MEMBER: 'Miembro', VIEWER: 'Observador' };

/**
 * Cuadro de texto con @menciones: al escribir "@" muestra a los miembros del tablero.
 * Solo se puede mencionar a miembros; si alguien no está, se avisa y (si puedes) se ofrece invitarlo.
 *
 * @param {string}   value
 * @param {Function} onChange          - (texto)
 * @param {object}   mentions          - { nombre: id } de las personas elegidas
 * @param {Function} onMentionsChange  - (mapa)
 * @param {Array}    members           - [{ id, name, role }]
 * @param {string}   inviteUrl         - Página para invitar (solo si puedes invitar)
 * @param {Function} onKeyDown         - Atajos del contenedor (ej. Ctrl+Enter)
 */
const MentionTextarea = ({ value, onChange, mentions, onMentionsChange, members = [], inviteUrl, onKeyDown, textareaRef, ...props }) => {
  const [query, setQuery] = useState(null); // texto después de "@" o null si no se está mencionando
  const [active, setActive] = useState(0);
  const innerRef = useRef(null);
  const ref = textareaRef || innerRef;

  // ¿Hay un "@algo" justo antes del cursor?
  const detect = (el) => {
    const before = el.value.slice(0, el.selectionStart);
    const match = before.match(/(^|\s)@([^\s@]{0,30})$/);
    setQuery(match ? match[2] : null);
    setActive(0);
  };

  const suggestions = query === null ? [] : members
    .filter((m) => normalize(m.name).split(/\s+/).some((w) => w.startsWith(normalize(query))) || normalize(m.name).startsWith(normalize(query)))
    .slice(0, MAX_SUGGESTIONS);

  const pick = (member) => {
    const el = ref.current;
    const caret = el.selectionStart;
    const before = value.slice(0, caret).replace(/@([^\s@]{0,30})$/, `@${member.name} `);
    const next = before + value.slice(caret);
    onChange(next);
    onMentionsChange({ ...mentions, [member.name]: member.id });
    setQuery(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(before.length, before.length);
    });
  };

  const handleKeyDown = (e) => {
    if (query !== null && suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % suggestions.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + suggestions.length) % suggestions.length); return; }
      if ((e.key === 'Enter' && !e.ctrlKey && !e.metaKey) || e.key === 'Tab') {
        e.preventDefault();
        pick(suggestions[active]);
        return;
      }
    }
    if (query !== null && e.key === 'Escape') {
      // Cierra la lista sin cerrar el modal de la tarea
      e.preventDefault();
      e.stopPropagation();
      setQuery(null);
      return;
    }
    onKeyDown?.(e);
  };

  return (
    <div className="mention-input">
      <Form.Control
        {...props}
        as="textarea"
        ref={ref}
        value={value}
        onChange={(e) => { onChange(e.target.value); detect(e.target); }}
        onClick={(e) => detect(e.target)}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        role="combobox"
        aria-expanded={query !== null}
        aria-autocomplete="list"
      />
      {query !== null && (
        <div className="mention-menu" role="listbox">
          {suggestions.length > 0 ? suggestions.map((m, i) => (
            <button
              key={m.id}
              type="button"
              role="option"
              aria-selected={i === active}
              className={`mention-option ${i === active ? 'is-active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); pick(m); }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="mention-avatar">{m.name.charAt(0).toUpperCase()}</span>
              <span className="mention-name">{m.name}</span>
              <span className="mention-role">{ROLE_LABEL[m.role] || ''}</span>
            </button>
          )) : (
            <div className="mention-empty">
              {members.length === 0
                ? 'En este tablero no hay a quién mencionar.'
                : <>Nadie con ese nombre en este tablero. Solo puedes mencionar a sus miembros.</>}
              {inviteUrl && (
                <a href={inviteUrl} target="_blank" rel="noopener noreferrer" onMouseDown={(e) => e.preventDefault()}>
                  Invitar a alguien al tablero
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MentionTextarea;
