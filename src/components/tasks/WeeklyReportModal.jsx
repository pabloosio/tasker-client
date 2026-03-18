import { useState, useEffect } from 'react';
import { Modal, Badge, Spinner } from 'react-bootstrap';
import { FiChevronLeft, FiChevronRight, FiCheckCircle, FiTrendingUp, FiPlus } from 'react-icons/fi';
import taskService from '../../services/taskService';

const PRIORITY_LABELS = { HIGH: 'Alta', MEDIUM: 'Media', LOW: 'Baja' };
const PRIORITY_VARIANTS = { HIGH: 'danger', MEDIUM: 'warning', LOW: 'success' };

/**
 * Formatea un rango de fechas "Semana del 16 al 22 de febrero"
 */
const formatWeekRange = (weekStart, weekEnd) => {
  if (!weekStart || !weekEnd) return '';
  const [y1, m1, d1] = weekStart.split('-').map(Number);
  const [, m2, d2] = weekEnd.split('-').map(Number);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  if (m1 === m2) {
    return `${d1} al ${d2} de ${months[m1 - 1]} ${y1}`;
  }
  return `${d1} de ${months[m1 - 1]} al ${d2} de ${months[m2 - 1]} ${y1}`;
};

/**
 * Modal de reporte semanal de productividad.
 *
 * @param {boolean} show - Controla visibilidad del modal
 * @param {function} onHide - Callback para cerrar el modal
 * @param {number} initialWeekOffset - Semana inicial (0=actual, -1=pasada)
 * @param {string} workspaceId - ID del workspace activo
 */
const WeeklyReportModal = ({ show, onHide, initialWeekOffset = -1, workspaceId }) => {
  const [weekOffset, setWeekOffset] = useState(initialWeekOffset);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Resetear offset cuando se abre el modal
  useEffect(() => {
    if (show) {
      setWeekOffset(initialWeekOffset);
    }
  }, [show, initialWeekOffset]);

  // Cargar reporte al cambiar semana o workspace
  useEffect(() => {
    if (!show) return;
    const fetchReport = async () => {
      setLoading(true);
      setError('');
      try {
        const params = { weekOffset };
        if (workspaceId) params.workspaceId = workspaceId;
        const res = await taskService.getWeeklyReport(params);
        setReport(res.data || res);
      } catch (err) {
        setError(err.response?.data?.message || 'Error al cargar el reporte');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [show, weekOffset, workspaceId]);

  const isCurrentWeek = weekOffset === 0;
  const weekLabel = weekOffset === 0 ? 'Esta semana'
    : weekOffset === -1 ? 'Semana pasada'
    : `Hace ${Math.abs(weekOffset)} semanas`;

  const completedTotal = report?.completed?.total ?? 0;
  const createdTotal = report?.created?.total ?? 0;
  const byPriority = report?.completed?.byPriority ?? {};
  const byCategory = report?.completed?.byCategory ?? [];

  return (
    <Modal show={show} onHide={onHide} centered size="sm">
      <Modal.Header closeButton className="border-0 pb-0">
        <div className="w-100">
          {/* Navegación de semanas */}
          <div className="d-flex align-items-center justify-content-between mb-1">
            <button
              className="btn btn-sm btn-link p-0 text-muted"
              onClick={() => setWeekOffset(prev => prev - 1)}
              title="Semana anterior"
            >
              <FiChevronLeft size={20} />
            </button>
            <div className="text-center">
              <div className="fw-semibold" style={{ fontSize: '0.85rem' }}>{weekLabel}</div>
              {report && (
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                  {formatWeekRange(report.weekStart, report.weekEnd)}
                </div>
              )}
            </div>
            <button
              className="btn btn-sm btn-link p-0 text-muted"
              onClick={() => setWeekOffset(prev => prev + 1)}
              disabled={isCurrentWeek}
              title="Semana siguiente"
            >
              <FiChevronRight size={20} />
            </button>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="pt-2 pb-4 px-4">
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" variant="primary" />
          </div>
        ) : error ? (
          <p className="text-danger text-center small mb-0">{error}</p>
        ) : report ? (
          <>
            {/* Número principal */}
            <div className="text-center mb-3 mt-2">
              <div
                className="d-flex align-items-center justify-content-center gap-2 mb-1"
                style={{ color: '#198754' }}
              >
                <FiCheckCircle size={28} />
                <span style={{ fontSize: '3rem', fontWeight: 700, lineHeight: 1 }}>
                  {completedTotal}
                </span>
              </div>
              <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                {completedTotal === 1 ? 'tarea completada' : 'tareas completadas'}
              </div>
              {completedTotal === 0 && (
                <div className="mt-2 text-muted small">
                  {isCurrentWeek
                    ? '¡Todavía queda tiempo!'
                    : 'Ninguna tarea completada esa semana.'}
                </div>
              )}
            </div>

            {/* Tareas creadas */}
            {createdTotal > 0 && (
              <div
                className="d-flex align-items-center gap-2 rounded px-3 py-2 mb-3"
                style={{ background: 'var(--bs-light, #f8f9fa)', fontSize: '0.82rem' }}
              >
                <FiPlus size={14} className="text-primary" />
                <span className="text-muted">
                  También creaste <strong>{createdTotal}</strong>{' '}
                  {createdTotal === 1 ? 'tarea nueva' : 'tareas nuevas'}
                </span>
              </div>
            )}

            {/* Desglose por prioridad */}
            {completedTotal > 0 && (
              <div className="mb-3">
                <div className="text-muted mb-2" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Por prioridad
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  {Object.entries(byPriority).map(([key, count]) =>
                    count > 0 ? (
                      <span key={key} className="d-flex align-items-center gap-1">
                        <Badge bg={PRIORITY_VARIANTS[key]} style={{ fontSize: '0.75rem' }}>
                          {PRIORITY_LABELS[key]}
                        </Badge>
                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>{count}</span>
                      </span>
                    ) : null
                  )}
                </div>
              </div>
            )}

            {/* Desglose por categoría */}
            {byCategory.length > 0 && (
              <div className="mb-1">
                <div className="text-muted mb-2" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Por categoría
                </div>
                <div className="d-flex flex-column gap-1">
                  {byCategory.map((cat) => (
                    <div key={cat.id ?? 'uncategorized'} className="d-flex align-items-center gap-2">
                      <span
                        className="rounded-circle flex-shrink-0"
                        style={{ width: 10, height: 10, backgroundColor: cat.color || '#6c757d', display: 'inline-block' }}
                      />
                      <span style={{ fontSize: '0.82rem', flex: 1 }}>{cat.name}</span>
                      <span className="text-muted fw-semibold" style={{ fontSize: '0.82rem' }}>{cat.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mensaje motivacional si hay completadas */}
            {completedTotal > 0 && (
              <div className="text-center mt-3">
                <FiTrendingUp size={14} className="text-success me-1" />
                <span className="text-success" style={{ fontSize: '0.8rem' }}>
                  {completedTotal >= 10
                    ? '¡Semana increible!'
                    : completedTotal >= 5
                    ? '¡Buena semana!'
                    : '¡Buen trabajo!'}
                </span>
              </div>
            )}
          </>
        ) : null}
      </Modal.Body>
    </Modal>
  );
};

export default WeeklyReportModal;
