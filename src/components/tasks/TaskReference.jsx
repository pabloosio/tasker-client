import { useState } from 'react';
import { FiCopy, FiLink, FiCheck } from 'react-icons/fi';
import { formatTaskKey, taskLink } from '../../utils/taskKey';

/**
 * ID de la tarea (#000142) con acciones para copiar el ID o el enlace directo.
 */
const TaskReference = ({ number, title, className = '' }) => {
  const [copied, setCopied] = useState(null); // 'id' | 'link' | null

  if (!number) return null;
  const key = formatTaskKey(number);

  const copy = async (what) => {
    // "#000142 Título" se entiende solo al pegarlo en Teams o en un correo
    const text = what === 'id' ? (title ? `${key} ${title}` : key) : taskLink(number);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      window.prompt('Copia el texto:', text);
    }
  };

  return (
    <span className={`task-ref ${className}`}>
      <span className="task-key">{key}</span>
      <button type="button" className="task-ref-btn" onClick={() => copy('id')} title="Copiar ID y título">
        {copied === 'id' ? <FiCheck size={12} /> : <FiCopy size={12} />}
      </button>
      <button type="button" className="task-ref-btn" onClick={() => copy('link')} title="Copiar enlace directo">
        {copied === 'link' ? <FiCheck size={12} /> : <FiLink size={12} />}
      </button>
      {copied && <span className="task-ref-copied">¡Copiado!</span>}
    </span>
  );
};

export default TaskReference;
