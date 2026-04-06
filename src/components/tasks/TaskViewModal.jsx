import { useState, useEffect } from 'react';
import { Modal, Spinner } from 'react-bootstrap';
import { FiClock, FiLoader, FiCheckCircle, FiCalendar, FiX } from 'react-icons/fi';
import checklistService from '../../services/checklistService';

const POSTIT_BG = {
  high:   '#ffd0dc',
  medium: '#fff2a6',
  low:    '#c9f7e3'
};

const STATUS_CONFIG = {
  pending:     { label: 'Pendiente',   icon: FiClock,       color: 'var(--warning, #F5D98C)' },
  in_progress: { label: 'En Progreso', icon: FiLoader,      color: 'var(--info, #8BC5D6)' },
  completed:   { label: 'Completada',  icon: FiCheckCircle, color: 'var(--success, #7BC89C)' }
};

const TaskViewModal = ({ show, onHide, task }) => {
  const [checklistItems, setChecklistItems] = useState([]);
  const [loadingChecklist, setLoadingChecklist] = useState(false);

  useEffect(() => {
    if (show && task?.id) {
      setLoadingChecklist(true);
      checklistService.getItems(task.id)
        .then((res) => setChecklistItems(res.data || []))
        .catch(() => setChecklistItems([]))
        .finally(() => setLoadingChecklist(false));
    } else {
      setChecklistItems([]);
    }
  }, [show, task?.id]);

  if (!task) return null;

  const bg         = POSTIT_BG[task.priority] || POSTIT_BG.medium;
  const status     = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  const catColor   = task.category?.color || 'var(--primary)';

  const completedItems = checklistItems.filter((i) => i.isCompleted).length;
  const totalItems     = checklistItems.length;
  const checklistPct   = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <Modal show={show} onHide={onHide} centered size="md" contentClassName="taskview-modal-wrapper">
      <style>{`
        .taskview-modal-wrapper {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        .taskview-postit {
          background:
            linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 45%),
            linear-gradient(0deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0) 35%),
            ${bg};
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 0.5rem;
          box-shadow:
            0 1px 0 rgba(255,255,255,0.55) inset,
            0 14px 28px rgba(16,24,40,0.12),
            0 6px 10px rgba(16,24,40,0.10);
          position: relative;
          overflow: hidden;
          font-family: var(--font-sans);
        }
        /* Cinta adhesiva — igual a .kanban-task-card::before */
        .taskview-postit::before {
          content: '';
          position: absolute;
          top: 6px;
          left: 50%;
          width: 52px;
          height: 14px;
          transform: translateX(-50%) rotate(-2deg);
          background: rgba(255,255,255,0.45);
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: 6px;
          box-shadow: 0 6px 10px rgba(16,24,40,0.08);
          pointer-events: none;
          opacity: 0.85;
          z-index: 1;
        }
        /* Esquina doblada — igual a .kanban-task-card::after */
        .taskview-postit::after {
          content: '';
          position: absolute;
          top: 0; right: 0;
          width: 30px; height: 30px;
          background: linear-gradient(
            135deg,
            rgba(255,255,255,0.92) 0%,
            rgba(255,255,255,0.35) 48%,
            rgba(0,0,0,0.10) 100%
          );
          clip-path: polygon(0 0, 100% 0, 100% 100%);
          border-left: 1px solid rgba(0,0,0,0.06);
          border-bottom: 1px solid rgba(0,0,0,0.06);
          opacity: 0.9;
          pointer-events: none;
        }
        .taskview-close {
          position: absolute;
          top: 10px; right: 10px;
          z-index: 10;
          background: rgba(0,0,0,0.06);
          border: none;
          border-radius: 50%;
          width: 26px; height: 26px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: var(--gray-600, #6B7685);
          transition: background 0.15s;
        }
        .taskview-close:hover { background: rgba(0,0,0,0.13); }
        .taskview-body { padding: 2rem 1.25rem 1.5rem; }
        .taskview-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--gray-800, #2D3540);
          line-height: 1.3;
          margin-bottom: 0.75rem;
        }
        .taskview-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 1rem; }
        .taskview-chip {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 10px; border-radius: 20px;
          font-size: 0.7rem; font-weight: 700;
          background: rgba(0,0,0,0.08);
          color: var(--gray-700, #4A5462);
          letter-spacing: 0.02em;
        }
        .taskview-section-label {
          font-size: 0.62rem; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.1em;
          color: var(--gray-500, #8994A2);
          margin-bottom: 0.3rem;
        }
        .taskview-desc {
          font-size: 0.88rem; line-height: 1.75;
          color: var(--gray-700, #4A5462);
          white-space: pre-wrap;
          background: rgba(255,255,255,0.35);
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 6px;
          padding: 0.6rem 0.9rem;
          margin-bottom: 1rem;
        }
        .taskview-meta-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 1rem; }
        .taskview-meta-pill {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px;
          background: rgba(255,255,255,0.4);
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 20px;
          font-size: 0.78rem; font-weight: 600;
          color: var(--gray-700, #4A5462);
        }
        .taskview-avatar {
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--primary, #6F63C6); color: #fff;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 0.6rem; font-weight: 800; flex-shrink: 0;
        }
        .taskview-checklist-item {
          display: flex; align-items: center; gap: 8px;
          padding: 5px 6px;
          border-bottom: 1px dashed rgba(0,0,0,0.08);
          font-size: 0.84rem;
          color: var(--gray-700, #4A5462);
        }
        .taskview-checklist-item:last-child { border-bottom: none; }
        .taskview-check {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid rgba(0,0,0,0.2); flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .taskview-check.done {
          background: var(--primary, #6F63C6);
          border-color: var(--primary, #6F63C6);
        }
      `}</style>

      <div className="taskview-postit">
        <button className="taskview-close" onClick={onHide} aria-label="Cerrar">
          <FiX size={13} />
        </button>

        <div className="taskview-body">
          {/* Título */}
          <div className="taskview-title">{task.title}</div>

          {/* Chips: estado + categoría */}
          <div className="taskview-chips">
            <span className="taskview-chip" style={{ background: `${status.color}55` }}>
              <StatusIcon size={11} />
              {status.label}
            </span>
            {task.category && (
              <span className="taskview-chip" style={{ background: `${catColor}30`, color: catColor }}>
                {task.category.name}
              </span>
            )}
          </div>

          {/* Descripción */}
          {task.description ? (
            <div className="taskview-desc">{task.description}</div>
          ) : (
            <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', fontStyle: 'italic', marginBottom: '1rem' }}>
              Sin descripción
            </p>
          )}

          {/* Meta: fecha y asignado */}
          {(task.dueDate || task.assignee) && (
            <div className="taskview-meta-row">
              {task.dueDate && (
                <span className="taskview-meta-pill">
                  <FiCalendar size={11} />
                  {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('es-AR', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </span>
              )}
              {task.assignee && (
                <span className="taskview-meta-pill">
                  <span className="taskview-avatar">
                    {task.assignee.name?.charAt(0)?.toUpperCase()}
                  </span>
                  {task.assignee.name}
                </span>
              )}
            </div>
          )}

          {/* Checklist */}
          {loadingChecklist ? (
            <div className="text-center py-2">
              <Spinner animation="border" size="sm" style={{ color: 'var(--primary)' }} />
            </div>
          ) : totalItems > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <p className="taskview-section-label mb-0">Subtareas</p>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--gray-500)' }}>
                  {completedItems}/{totalItems}
                </span>
              </div>
              <div style={{ height: 3, borderRadius: 3, background: 'rgba(0,0,0,0.1)', marginBottom: 8, overflow: 'hidden' }}>
                <div style={{
                  width: `${checklistPct}%`, height: '100%',
                  background: checklistPct === 100 ? 'var(--success, #7BC89C)' : 'var(--primary, #6F63C6)',
                  borderRadius: 3, transition: 'width 0.3s ease'
                }} />
              </div>
              <div>
                {checklistItems.map((item) => (
                  <div key={item.id} className="taskview-checklist-item">
                    <span className={`taskview-check ${item.isCompleted ? 'done' : ''}`}>
                      {item.isCompleted && (
                        <svg width="7" height="6" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    <span style={{
                      textDecoration: item.isCompleted ? 'line-through' : 'none',
                      opacity: item.isCompleted ? 0.5 : 1
                    }}>
                      {item.content}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default TaskViewModal;
