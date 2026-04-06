import { useState, useEffect, useCallback } from 'react';
import { Button, Spinner, Form, Alert, Row, Col } from 'react-bootstrap';
import { FiDownload, FiFileText, FiGrid, FiChevronLeft, FiChevronRight, FiRefreshCw } from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';
import exportService from '../../services/exportService';
import categoryService from '../../services/categoryService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatDate } from '../../utils/dateUtils';

// ── Helpers de fecha ─────────────────────────────────────────────────────────
const toIso = (d) => d.toISOString().split('T')[0];

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

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS   = ['dom','lun','mar','mié','jue','vie','sáb'];

const weekLabel = (s, e) => {
  const sd = new Date(s + 'T12:00:00'), ed = new Date(e + 'T12:00:00');
  const year = ed.getFullYear();
  if (sd.getMonth() === ed.getMonth())
    return `${DAYS[sd.getDay()]} ${sd.getDate()} – ${DAYS[ed.getDay()]} ${ed.getDate()} ${MONTHS[sd.getMonth()]} ${year}`;
  return `${DAYS[sd.getDay()]} ${sd.getDate()} ${MONTHS[sd.getMonth()]} – ${DAYS[ed.getDay()]} ${ed.getDate()} ${MONTHS[ed.getMonth()]} ${year}`;
};
const monthLabel = (iso) => { const d = new Date(iso + 'T12:00:00'); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

// ── Constantes visuales ───────────────────────────────────────────────────────
const STATUS_MAP = {
  PENDING:     { label: 'Pendiente',    bg: '#FEF3C7', color: '#92400E' },
  IN_PROGRESS: { label: 'En Progreso',  bg: '#DBEAFE', color: '#1E40AF' },
  COMPLETED:   { label: 'Completada',   bg: '#D1FAE5', color: '#065F46' }
};
const PRIORITY_MAP = { HIGH: '#EF4444', MEDIUM: '#F59E0B', LOW: '#9CA3AF' };
const PRIORITY_LABEL = { HIGH: '↑ Alta', MEDIUM: '→ Media', LOW: '↓ Baja' };

// ── Sub-componente: Preview HTML ──────────────────────────────────────────────
const ReportPreview = ({ data, loading }) => {
  if (loading) return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 text-muted">
      <Spinner animation="border" style={{ color: '#6B9FD4' }} />
      <span className="small mt-3">Cargando reporte...</span>
    </div>
  );

  if (!data) return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 text-muted">
      <FiRefreshCw size={28} className="mb-2 opacity-40" />
      <span className="small">Selecciona los filtros para ver el reporte</span>
    </div>
  );

  const STATUS_TEXT = {
    PENDING:     { label: 'Pendiente',   color: '#92400E' },
    IN_PROGRESS: { label: 'En Progreso', color: '#1E40AF' },
    COMPLETED:   { label: 'Completada',  color: '#166534' }
  };

  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', fontSize: '13px', background: '#fff' }}>

      {/* Encabezado */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Reporte de Tareas</div>
        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
          {data.period.startDate
            ? `${formatDate(data.period.startDate)} — ${formatDate(data.period.endDate)}`
            : 'Todas las fechas'}
          {' · '}{data.userName}
        </div>
      </div>

      {/* Resumen */}
      <div style={{ padding: '8px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, color: '#6B7280' }}>
        <span><strong style={{ color: '#111827' }}>{data.summary.total}</strong> total</span>
        <span><strong style={{ color: '#166534' }}>{data.summary.completed}</strong> completadas</span>
        <span><strong style={{ color: '#1E40AF' }}>{data.summary.inProgress}</strong> en progreso</span>
        <span><strong style={{ color: '#92400E' }}>{data.summary.pending}</strong> pendientes</span>
      </div>

      {data.summary.total === 0 && (
        <div className="text-center py-4 text-muted small">No hay tareas en este período con los filtros seleccionados</div>
      )}

      {/* Grupos por categoría */}
      {data.groups.map(group => (
        <div key={group.name} style={{ marginTop: 4 }}>

          {/* Cabecera: borde izquierdo de color, fondo neutro */}
          <div style={{
            padding: '8px 20px',
            borderLeft: `3px solid ${group.color}`,
            borderBottom: '1px solid #F3F4F6',
            background: '#FAFAFA',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: '#374151' }}>{group.name}</span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{group.tasks.length} tarea{group.tasks.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Tareas */}
          {group.tasks.map((task, idx) => {
            const st = STATUS_TEXT[task.status] || STATUS_TEXT.PENDING;
            return (
              <div key={task.id} style={{ padding: '12px 20px 12px 24px', borderBottom: '1px solid #E5E7EB' }}>

                {/* Título + estado (solo texto) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>
                    {idx + 1}. {task.title}
                  </span>
                  <span style={{ fontSize: 11, color: st.color, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {st.label}
                  </span>
                </div>

                {/* Descripción */}
                {task.description && (
                  <p style={{ color: '#6B7280', fontSize: 12, lineHeight: 1.55, margin: '0 0 8px' }}>
                    {task.description}
                  </p>
                )}

                {/* Creador / Asignado — texto plano, nombres en negrita */}
                <div style={{ fontSize: 12, color: '#4B5563', marginBottom: 5 }}>
                  <span style={{ color: '#9CA3AF' }}>Creador: </span>
                  <strong>{task.creator || '—'}</strong>
                  {task.assignee && (
                    <>
                      <span style={{ color: '#D1D5DB', margin: '0 6px' }}>·</span>
                      <span style={{ color: '#9CA3AF' }}>Asignado: </span>
                      <strong>{task.assignee}</strong>
                    </>
                  )}
                </div>

                {/* Meta: prioridad, checklist, fechas */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: '#9CA3AF' }}>
                  <span style={{ color: PRIORITY_MAP[task.priority] }}>{PRIORITY_LABEL[task.priority]}</span>
                  {task.checklistTotal > 0 && <span>{task.checklistDone}/{task.checklistTotal} ítems</span>}
                  <span>Creada: {formatDate(task.createdAt)}</span>
                  {task.dueDate && <span>Para: {formatDate(task.dueDate)}</span>}
                  {task.completedAt && <span style={{ color: '#166534', fontWeight: 600 }}>Completada: {formatDate(task.completedAt)}</span>}
                </div>

              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────
const ExportPage = () => {
  const { workspaces, currentWorkspace } = useWorkspace();
  const [periodType,   setPeriodType]   = useState('week');
  const [currentDate,  setCurrentDate]  = useState(toIso(new Date()));
  const [selectedWs,   setSelectedWs]   = useState('');
  const [categories,   setCategories]   = useState([]);
  const [selectedCats, setSelectedCats] = useState(new Set());
  const [loadingCats,  setLoadingCats]  = useState(false);
  const [reportData,   setReportData]   = useState(null);
  const [loadingReport,setLoadingReport]= useState(false);
  const [loading,      setLoading]      = useState({ excel: false, pdf: false });
  const [error,        setError]        = useState('');

  const { startDate, endDate } = periodType === 'week'
    ? getWeekBounds(currentDate)
    : getMonthBounds(currentDate);

  const label = periodType === 'week' ? weekLabel(startDate, endDate) : monthLabel(startDate);

  const buildFilters = useCallback(() => ({
    startDate,
    endDate,
    workspaceId: selectedWs || undefined,
    categoryIds: selectedCats.size > 0 && selectedCats.size < categories.length
      ? Array.from(selectedCats) : []
  }), [startDate, endDate, selectedWs, selectedCats, categories.length]);

  // Sincronizar selectedWs con el workspace activo del contexto global
  useEffect(() => {
    if (currentWorkspace?.id) setSelectedWs(currentWorkspace.id);
  }, [currentWorkspace?.id]);

  // Carga categorías al cambiar workspace
  useEffect(() => {
    if (!selectedWs) { setCategories([]); setSelectedCats(new Set()); return; }
    setLoadingCats(true);
    categoryService.getCategories({ workspaceId: selectedWs })
      .then(res => {
        const list = res?.data || [];
        setCategories(list);
        setSelectedCats(new Set(list.map(c => c.id)));
      })
      .catch(() => setCategories([]))
      .finally(() => setLoadingCats(false));
  }, [selectedWs]);

  // Auto-fetch del reporte con debounce cuando cambian los filtros
  useEffect(() => {
    const catsKey = Array.from(selectedCats).sort().join(',');
    const timer = setTimeout(() => {
      setLoadingReport(true);
      exportService.getReport(buildFilters())
        .then(data => setReportData(data))
        .catch(() => setReportData(null))
        .finally(() => setLoadingReport(false));
    }, 350);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, selectedWs, Array.from(selectedCats).sort().join(',')]);

  const navigate = (dir) => {
    const d = new Date(currentDate + 'T12:00:00');
    if (periodType === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(toIso(d));
  };

  const toggleCat = (id) =>
    setSelectedCats(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () =>
    setSelectedCats(selectedCats.size === categories.length
      ? new Set() : new Set(categories.map(c => c.id)));

  const handleExport = async (format) => {
    setLoading(prev => ({ ...prev, [format]: true }));
    setError('');
    try {
      if (format === 'excel') await exportService.downloadExcel(buildFilters());
      else                    await exportService.downloadPdf(buildFilters());
    } catch (err) {
      setError(err?.message || `Error al generar ${format.toUpperCase()}`);
    } finally {
      setLoading(prev => ({ ...prev, [format]: false }));
    }
  };

  const isLoading = loading.excel || loading.pdf;

  return (
    <MainLayout>
      <div className="export-page">

        {/* ── Encabezado de página ── */}
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
          <div>
            <h4 className="mb-0">Reporte de tareas</h4>
            <p className="text-muted small mb-0">Vista previa + exportar</p>
          </div>
          {/* Botones minimalistas */}
          <div className="d-flex gap-2">
            <Button
              size="sm" variant="outline-success"
              onClick={() => handleExport('excel')}
              disabled={isLoading}
              style={{ fontWeight: 600 }}
            >
              {loading.excel
                ? <Spinner animation="border" size="sm" />
                : <><FiGrid size={13} className="me-1" />.xlsx</>}
            </Button>
            <Button
              size="sm" variant="outline-danger"
              onClick={() => handleExport('pdf')}
              disabled={isLoading}
              style={{ fontWeight: 600 }}
            >
              {loading.pdf
                ? <Spinner animation="border" size="sm" />
                : <><FiFileText size={13} className="me-1" />.pdf</>}
            </Button>
          </div>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-3">{error}</Alert>}

        <Row className="g-3 align-items-start">

          {/* ── Panel lateral de filtros ── */}
          <Col xs={12} lg={3}>
          <div>

            {/* Tipo de período */}
            <div className="mb-3">
              <div className="small fw-semibold text-muted text-uppercase mb-2" style={{ letterSpacing: '0.05em', fontSize: 11 }}>Período</div>
              <div className="d-flex gap-1">
                {['week', 'month'].map(t => (
                  <Button key={t} size="sm" variant={periodType === t ? 'primary' : 'outline-secondary'}
                    className="flex-fill" style={{ fontSize: 12 }}
                    onClick={() => setPeriodType(t)}>
                    {t === 'week' ? 'Semana' : 'Mes'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Navegación de fecha */}
            <div className="mb-3">
              <div className="d-flex align-items-center gap-1">
                <Button size="sm" variant="outline-secondary" onClick={() => navigate(-1)} disabled={isLoading} style={{ padding: '2px 7px' }}>
                  <FiChevronLeft size={14} />
                </Button>
                <span className="flex-fill text-center fw-semibold" style={{ fontSize: 12, lineHeight: 1.3 }}>{label}</span>
                <Button size="sm" variant="outline-secondary" onClick={() => navigate(1)} disabled={isLoading} style={{ padding: '2px 7px' }}>
                  <FiChevronRight size={14} />
                </Button>
              </div>
            </div>

            {/* Tablero */}
            {workspaces.length > 0 && (
              <div className="mb-3">
                <div className="small fw-semibold text-muted text-uppercase mb-2" style={{ letterSpacing: '0.05em', fontSize: 11 }}>Tablero</div>
                <Form.Select size="sm" value={selectedWs} onChange={e => setSelectedWs(e.target.value)} style={{ fontSize: 12 }}>
                  <option value="">Todos</option>
                  {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
                </Form.Select>
              </div>
            )}

            {/* Categorías */}
            {selectedWs && (
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="small fw-semibold text-muted text-uppercase" style={{ letterSpacing: '0.05em', fontSize: 11 }}>Categorías</div>
                  {categories.length > 0 && (
                    <button className="btn btn-link p-0 text-muted text-decoration-none" style={{ fontSize: 11 }} onClick={toggleAll}>
                      {selectedCats.size === categories.length ? 'Ninguna' : 'Todas'}
                    </button>
                  )}
                </div>
                {loadingCats
                  ? <Spinner animation="border" size="sm" />
                  : categories.length === 0
                    ? <p className="text-muted small mb-0">Sin categorías</p>
                    : (
                      <div className="d-flex flex-wrap gap-2">
                        {categories.map(cat => (
                          <Form.Check key={cat.id} type="checkbox" id={`cat-${cat.id}`}
                            checked={selectedCats.has(cat.id)} onChange={() => toggleCat(cat.id)}
                            label={
                              <span className="d-flex align-items-center gap-2">
                                <span style={{ width: 9, height: 9, borderRadius: 2, background: cat.color, display: 'inline-block', flexShrink: 0 }} />
                                <span style={{ fontSize: 12 }}>{cat.name}</span>
                              </span>
                            }
                          />
                        ))}
                      </div>
                    )
                }
              </div>
            )}

            {/* Botones de descarga repetidos (más accesibles) */}
            <div className="d-flex gap-2 pt-2" style={{ borderTop: '1px solid #E5E7EB' }}>
              <Button size="sm" variant="outline-success" onClick={() => handleExport('excel')} disabled={isLoading} className="flex-fill">
                {loading.excel ? <Spinner animation="border" size="sm" /> : <><FiDownload size={12} className="me-1" />Excel</>}
              </Button>
              <Button size="sm" variant="outline-danger" onClick={() => handleExport('pdf')} disabled={isLoading} className="flex-fill">
                {loading.pdf ? <Spinner animation="border" size="sm" /> : <><FiDownload size={12} className="me-1" />PDF</>}
              </Button>
            </div>

          </div>
          </Col>

          {/* ── Preview HTML ── */}
          <Col xs={12} lg={9}>
            <ReportPreview data={reportData} loading={loadingReport} />
          </Col>

        </Row>
      </div>
    </MainLayout>
  );
};

export default ExportPage;
