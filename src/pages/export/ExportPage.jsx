import { useState, useEffect, useCallback } from 'react';
import { Spinner, Form, Alert } from 'react-bootstrap';
import {
  FiDownload, FiChevronLeft, FiChevronRight, FiCheckCircle,
  FiLoader, FiEye, FiClock, FiInbox, FiAlertCircle, FiCalendar, FiBarChart2
} from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';
import exportService from '../../services/exportService';
import categoryService from '../../services/categoryService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatDate } from '../../utils/dateUtils';
import './ExportPage.css';

// ── Helpers de fecha (siempre en hora local: toISOString daría el día siguiente por la noche) ──
const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getWeekBounds = (iso) => {
  const d = new Date(iso + 'T12:00:00');
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { startDate: toIso(mon), endDate: toIso(sun) };
};

const getMonthBounds = (iso) => {
  const d = new Date(iso + 'T12:00:00');
  return {
    startDate: toIso(new Date(d.getFullYear(), d.getMonth(), 1)),
    endDate:   toIso(new Date(d.getFullYear(), d.getMonth() + 1, 0))
  };
};

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const weekLabel = (s, e) => {
  const sd = new Date(s + 'T12:00:00'), ed = new Date(e + 'T12:00:00');
  if (sd.getMonth() === ed.getMonth()) return `${sd.getDate()} – ${ed.getDate()} de ${MONTHS[ed.getMonth()]} ${ed.getFullYear()}`;
  return `${sd.getDate()} ${MONTHS[sd.getMonth()].slice(0, 3)} – ${ed.getDate()} ${MONTHS[ed.getMonth()].slice(0, 3)} ${ed.getFullYear()}`;
};
const monthLabel = (iso) => { const d = new Date(iso + 'T12:00:00'); return `${capitalize(MONTHS[d.getMonth()])} ${d.getFullYear()}`; };

// ── Estados y prioridades (mismos colores que el tablero) ──
const STATUSES = [
  { key: 'COMPLETED',   summary: 'completed',  label: 'Completadas', short: 'Completada',  icon: FiCheckCircle, color: '#198754' },
  { key: 'IN_REVIEW',   summary: 'inReview',   label: 'En revisión', short: 'En revisión', icon: FiEye,         color: '#8b5cf6' },
  { key: 'IN_PROGRESS', summary: 'inProgress', label: 'En progreso', short: 'En progreso', icon: FiLoader,      color: '#0aa2c0' },
  { key: 'PENDING',     summary: 'pending',    label: 'Por hacer',   short: 'Por hacer',   icon: FiClock,       color: '#d39e00' },
  { key: 'BACKLOG',     summary: 'backlog',    label: 'Backlog',     short: 'Backlog',     icon: FiInbox,       color: '#94a3b8' }
];
const STATUS_BY_KEY = Object.fromEntries(STATUSES.map((s) => [s.key, s]));
const PRIORITY = {
  HIGH:   { label: 'Alta',  color: '#dc3545' },
  MEDIUM: { label: 'Media', color: '#d39e00' },
  LOW:    { label: 'Baja',  color: '#198754' }
};

const isOverdue = (task, today) => task.dueDate && task.status !== 'COMPLETED' && task.dueDate < today;
const pct = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

// ── Reporte ──
const ReportBody = ({ data, showBoard, onShowMonth, canShowMonth }) => {
  const today = toIso(new Date());
  const { summary } = data;
  const overdue = data.groups.flatMap((g) => g.tasks).filter((t) => isOverdue(t, today)).length;

  if (summary.total === 0) {
    return (
      <div className="rpt-empty">
        <FiBarChart2 size={26} className="mb-2" />
        <h6>No hay tareas en este período</h6>
        <p>Se incluyen las tareas creadas o completadas dentro de las fechas elegidas.</p>
        {canShowMonth && (
          <button type="button" className="rpt-link-btn" onClick={onShowMonth}>Ver el mes completo</button>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Resumen: una línea, la barra de avance y la leyenda con los números */}
      <div className="rpt-card rpt-summary">
        <div className="rpt-summary-line">
          <strong>{summary.total} {summary.total === 1 ? 'tarea' : 'tareas'}</strong>
          <span>· {pct(summary.completed, summary.total)}% completado</span>
          {overdue > 0 && <span className="rpt-late">· {overdue} {overdue === 1 ? 'vencida' : 'vencidas'}</span>}
        </div>
        <div className="rpt-stack" role="img" aria-label="Distribución de tareas por estado">
          {STATUSES.filter((s) => summary[s.summary] > 0).map((s) => (
            <span
              key={s.key}
              style={{ width: `${pct(summary[s.summary], summary.total)}%`, background: s.color }}
              title={`${s.label}: ${summary[s.summary]}`}
            />
          ))}
        </div>
        <div className="rpt-legend">
          {STATUSES.filter((s) => summary[s.summary] > 0).map((s) => (
            <span key={s.key}>
              <span className="rpt-dot" style={{ background: s.color }} />
              {s.label} <strong>{summary[s.summary]}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* Tareas por categoría, en una sola lista */}
      <div className="rpt-card rpt-list">
        {data.groups.map((group) => {
          const done = group.tasks.filter((t) => t.status === 'COMPLETED').length;
          return (
            <section key={group.name}>
              <h6 className="rpt-group-title">
                <span className="rpt-dot" style={{ background: group.color }} />
                {group.name}
                <span className="rpt-group-count">{done}/{group.tasks.length} completadas</span>
              </h6>
              {group.tasks.map((task) => {
                const status = STATUS_BY_KEY[task.status] || STATUS_BY_KEY.PENDING;
                const late = isOverdue(task, today);
                return (
                  <div key={task.id} className="rpt-row">
                    <div className="rpt-row-task">
                      <span
                        className="rpt-priority"
                        style={{ background: (PRIORITY[task.priority] || PRIORITY.MEDIUM).color }}
                        title={`Prioridad ${(PRIORITY[task.priority] || PRIORITY.MEDIUM).label.toLowerCase()}`}
                      />
                      <span className="task-key">{task.key}</span>
                      <span className="rpt-row-title">{task.title}</span>
                      {showBoard && task.board && <span className="rpt-row-board">{task.board}</span>}
                    </div>
                    <span className="rpt-row-person">{task.assignee || <span className="rpt-muted">Sin asignar</span>}</span>
                    <span className={`rpt-row-date ${late ? 'rpt-late' : ''}`}>
                      {task.completedAt
                        ? formatDate(task.completedAt)
                        : task.dueDate
                          ? `${formatDate(task.dueDate)}${late ? ' · vencida' : ''}`
                          : <span className="rpt-muted">Sin fecha</span>}
                    </span>
                    <span className="rpt-pill" style={{ '--pill-color': status.color }}>{status.short}</span>
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
    </>
  );
};

// ── Página ──
const ExportPage = () => {
  const { workspaces, currentWorkspace } = useWorkspace();
  const [periodType,    setPeriodType]    = useState('week');
  const [currentDate,   setCurrentDate]   = useState(toIso(new Date()));
  const [selectedWs,    setSelectedWs]    = useState(currentWorkspace?.id || '');
  const [categories,    setCategories]    = useState([]);
  const [selectedCats,  setSelectedCats]  = useState(new Set());
  const [loadingCats,   setLoadingCats]   = useState(false);
  const [reportData,    setReportData]    = useState(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [reportError,   setReportError]   = useState(false);
  const [loading,       setLoading]       = useState({ excel: false, pdf: false });
  const [error,         setError]         = useState('');
  const [reloadKey,     setReloadKey]     = useState(0);

  const { startDate, endDate } = periodType === 'week'
    ? getWeekBounds(currentDate)
    : getMonthBounds(currentDate);

  const label = periodType === 'week' ? weekLabel(startDate, endDate) : monthLabel(startDate);
  const isCurrentPeriod = (() => {
    const today = toIso(new Date());
    return today >= startDate && today <= endDate;
  })();

  const buildFilters = useCallback(() => ({
    startDate,
    endDate,
    workspaceId: selectedWs || undefined,
    categoryIds: selectedCats.size > 0 && selectedCats.size < categories.length
      ? Array.from(selectedCats) : []
  }), [startDate, endDate, selectedWs, selectedCats, categories.length]);

  // Seguir al tablero activo del selector de arriba
  const [syncedWs, setSyncedWs] = useState(currentWorkspace?.id);
  if (currentWorkspace?.id && currentWorkspace.id !== syncedWs) {
    setSyncedWs(currentWorkspace.id);
    setSelectedWs(currentWorkspace.id);
  }

  // Categorías del tablero elegido
  useEffect(() => {
    if (!selectedWs) return undefined;
    let active = true;
    const timer = setTimeout(() => {
      setLoadingCats(true);
      categoryService.getCategories({ workspaceId: selectedWs })
        .then((res) => {
          if (!active) return;
          const list = res?.data || [];
          setCategories(list);
          setSelectedCats(new Set(list.map((c) => c.id)));
        })
        .catch(() => active && setCategories([]))
        .finally(() => active && setLoadingCats(false));
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [selectedWs]);

  // Reporte: se vuelve a pedir (con una pequeña espera) cuando cambian los filtros.
  // Mientras carga se deja visible el anterior, atenuado, para que la página no "salte".
  const catsKey = Array.from(selectedCats).sort().join(',');
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoadingReport(true);
      exportService.getReport(buildFilters())
        .then((data) => { if (active) { setReportData(data); setReportError(false); } })
        .catch(() => active && setReportError(true))
        .finally(() => active && setLoadingReport(false));
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, selectedWs, catsKey, reloadKey]);

  const changeBoard = (id) => {
    setSelectedWs(id);
    if (!id) {
      setCategories([]);
      setSelectedCats(new Set());
    }
  };

  const move = (dir) => {
    const d = new Date(currentDate + 'T12:00:00');
    if (periodType === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(toIso(d));
  };

  const toggleCat = (id) =>
    setSelectedCats((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const toggleAll = () =>
    setSelectedCats(selectedCats.size === categories.length ? new Set() : new Set(categories.map((c) => c.id)));

  const handleExport = async (format) => {
    setLoading((prev) => ({ ...prev, [format]: true }));
    setError('');
    try {
      if (format === 'excel') await exportService.downloadExcel(buildFilters());
      else await exportService.downloadPdf(buildFilters());
    } catch (err) {
      setError(err?.message || `No se pudo generar el ${format === 'excel' ? 'Excel' : 'PDF'}`);
    } finally {
      setLoading((prev) => ({ ...prev, [format]: false }));
    }
  };

  const exporting = loading.excel || loading.pdf;
  const noCategorySelected = selectedWs && categories.length > 0 && selectedCats.size === 0;

  return (
    <MainLayout>
      <div className="rpt-page">
        {/* Encabezado */}
        <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
          <div>
            <h2 className="mb-1">Reportes</h2>
            <p className="text-muted mb-0">Lo que pasó en tus tableros, listo para descargar.</p>
          </div>
          <div className="d-flex gap-2">
            <button type="button" className="rpt-btn" onClick={() => handleExport('excel')} disabled={exporting || noCategorySelected}>
              {loading.excel ? <Spinner animation="border" size="sm" /> : <FiDownload size={14} />} Excel
            </button>
            <button type="button" className="rpt-btn" onClick={() => handleExport('pdf')} disabled={exporting || noCategorySelected}>
              {loading.pdf ? <Spinner animation="border" size="sm" /> : <FiDownload size={14} />} PDF
            </button>
          </div>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-3">{error}</Alert>}

        {/* Filtros */}
        <div className="rpt-card rpt-filters">
          <div className="rpt-filters-row">
            <div className="rpt-segmented" role="radiogroup" aria-label="Período">
              {[['week', 'Semana'], ['month', 'Mes']].map(([value, text]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={periodType === value}
                  className={periodType === value ? 'is-active' : ''}
                  onClick={() => setPeriodType(value)}
                >
                  {text}
                </button>
              ))}
            </div>

            <div className="rpt-period">
              <button type="button" className="rpt-icon-btn" onClick={() => move(-1)} aria-label="Período anterior">
                <FiChevronLeft size={16} />
              </button>
              <span className="rpt-period-label"><FiCalendar size={13} /> {label}</span>
              <button type="button" className="rpt-icon-btn" onClick={() => move(1)} aria-label="Período siguiente">
                <FiChevronRight size={16} />
              </button>
              {!isCurrentPeriod && (
                <button type="button" className="rpt-link-btn" onClick={() => setCurrentDate(toIso(new Date()))}>Hoy</button>
              )}
            </div>

            {workspaces.length > 0 && (
              <Form.Select
                size="sm"
                className="rpt-board-select"
                value={selectedWs}
                onChange={(e) => changeBoard(e.target.value)}
                aria-label="Tablero"
              >
                <option value="">Todos los tableros</option>
                {workspaces.map((ws) => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
              </Form.Select>
            )}

            {loadingReport && reportData && <Spinner animation="border" size="sm" className="rpt-refreshing" />}
          </div>

          {selectedWs && (loadingCats || categories.length > 0) && (
            <div className="rpt-filters-cats">
              <span className="rpt-filter-label">Categorías</span>
              {loadingCats ? <Spinner animation="border" size="sm" /> : (
                <>
                  {categories.map((cat) => {
                    const on = selectedCats.has(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`rpt-chip ${on ? 'is-on' : ''}`}
                        style={{ '--chip-color': cat.color }}
                        aria-pressed={on}
                        onClick={() => toggleCat(cat.id)}
                      >
                        <span className="rpt-dot" style={{ background: cat.color }} />
                        {cat.name}
                      </button>
                    );
                  })}
                  <button type="button" className="rpt-link-btn" onClick={toggleAll}>
                    {selectedCats.size === categories.length ? 'Quitar todas' : 'Elegir todas'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Contenido */}
        {noCategorySelected ? (
          <div className="rpt-empty">
            <h6>Elige al menos una categoría</h6>
            <p>Activa una o más categorías arriba para ver el reporte.</p>
          </div>
        ) : !reportData && loadingReport ? (
          <div className="rpt-loading"><Spinner animation="border" /><span>Preparando el reporte…</span></div>
        ) : reportError && !reportData ? (
          <div className="rpt-empty">
            <FiAlertCircle size={26} className="mb-2 text-danger" />
            <h6>No se pudo cargar el reporte</h6>
            <p>Revisa tu conexión e intenta de nuevo.</p>
            <button type="button" className="rpt-link-btn" onClick={() => setReloadKey((k) => k + 1)}>Reintentar</button>
          </div>
        ) : reportData && (
          <div className={`rpt-body ${loadingReport ? 'is-refreshing' : ''}`}>
            <ReportBody
              data={reportData}
              showBoard={!selectedWs}
              canShowMonth={periodType === 'week'}
              onShowMonth={() => setPeriodType('month')}
            />
            <p className="rpt-footnote">Incluye las tareas creadas o completadas en el período. Excel y PDF descargan lo mismo que ves aquí.</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ExportPage;
