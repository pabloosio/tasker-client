import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Row, Col, Card, Spinner, Alert, Form, Button, Badge } from 'react-bootstrap';
import { FiArrowLeft, FiActivity, FiShield, FiX } from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';
import ActivityItem from '../../components/activity/ActivityItem';
import activityService from '../../services/activityService';
import workspaceService from '../../services/workspaceService';
import adminService from '../../services/adminService';
import { ACTIVITY_GROUPS } from '../../utils/activityFormat';

const EMPTY_FILTERS = { actorId: '', group: '', from: '', to: '', task: '' };

/**
 * Actividad de un tablero (scope="workspace", Propietario/Administradores)
 * o auditoría global (scope="global", administradores de la plataforma).
 */
const ActivityPage = ({ scope }) => {
  const { id: workspaceId } = useParams();
  const isGlobal = scope === 'global';

  const [workspace, setWorkspace] = useState(null);
  const [people, setPeople] = useState([]);
  const [boardFilter, setBoardFilter] = useState(null); // { id, name } solo en global
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Datos para los filtros: nombre del tablero y lista de personas
  useEffect(() => {
    const loadContext = async () => {
      try {
        if (isGlobal) {
          const response = await adminService.getUsers({ limit: 100 });
          setPeople((response.data?.users || []).map(u => ({ id: u.id, name: u.name })));
        } else {
          const [wsResponse, membersResponse] = await Promise.all([
            workspaceService.getWorkspaceById(workspaceId),
            workspaceService.getMembers(workspaceId)
          ]);
          setWorkspace(wsResponse.data || wsResponse);
          const members = membersResponse.data || membersResponse || [];
          setPeople(members.map(m => ({ id: m.userId || m.user?.id, name: m.user?.name })));
        }
      } catch {
        // Los filtros de persona quedan vacíos; la actividad se sigue cargando
      }
    };
    loadContext();
  }, [isGlobal, workspaceId]);

  const fetchPage = async (page) => {
    const params = { ...filters, page, limit: 30 };
    if (isGlobal && boardFilter) params.workspaceId = boardFilter.id;
    const response = isGlobal
      ? await activityService.getGlobalActivity(params)
      : await activityService.getWorkspaceActivity(workspaceId, params);
    return response.data;
  };

  // Recargar desde la página 1 cuando cambian los filtros (con un pequeño debounce por el campo de ID)
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchPage(1);
        if (cancelled) return;
        setItems(data.items);
        setPagination(data.pagination);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'No se pudo cargar la actividad');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [filters, boardFilter, workspaceId, isGlobal]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await fetchPage(pagination.page + 1);
      setItems(prev => [...prev, ...data.items]);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar más actividad');
    } finally {
      setLoadingMore(false);
    }
  };

  const setFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));
  const hasFilters = Object.values(filters).some(Boolean) || !!boardFilter;

  return (
    <MainLayout>
      <div className="mb-4">
        {!isGlobal && (
          <Link to={`/workspaces/${workspaceId}`} className="text-decoration-none small d-inline-flex align-items-center gap-1 mb-2">
            <FiArrowLeft /> Volver al tablero
          </Link>
        )}
        <h2 className="mb-1 d-flex align-items-center gap-2">
          {isGlobal ? <FiShield /> : <FiActivity />}
          {isGlobal ? 'Auditoría' : 'Actividad del tablero'}
        </h2>
        <p className="text-muted mb-0">
          {isGlobal
            ? 'Todos los movimientos de todos los tableros del sistema. Los registros no se pueden editar ni borrar.'
            : <>Todo lo que ha pasado en <strong>{workspace?.name || '…'}</strong>, incluidas las tareas eliminadas.</>}
        </p>
      </div>

      <Row>
        <Col lg={3} className="mb-4">
          <Card className="shadow-sm">
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label className="small text-muted mb-1">ID de tarea</Form.Label>
                <Form.Control size="sm" placeholder="Ej. 142 o #000142" value={filters.task} onChange={(e) => setFilter('task', e.target.value)} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="small text-muted mb-1">Persona</Form.Label>
                <Form.Select size="sm" value={filters.actorId} onChange={(e) => setFilter('actorId', e.target.value)}>
                  <option value="">Todas</option>
                  {people.filter(p => p.id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="small text-muted mb-1">Tipo de evento</Form.Label>
                <Form.Select size="sm" value={filters.group} onChange={(e) => setFilter('group', e.target.value)}>
                  {ACTIVITY_GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </Form.Select>
              </Form.Group>
              <Row className="g-2 mb-3">
                <Col xs={6}>
                  <Form.Label className="small text-muted mb-1">Desde</Form.Label>
                  <Form.Control size="sm" type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
                </Col>
                <Col xs={6}>
                  <Form.Label className="small text-muted mb-1">Hasta</Form.Label>
                  <Form.Control size="sm" type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} />
                </Col>
              </Row>
              {isGlobal && (
                <p className="small text-muted mb-3">
                  Para ver un solo tablero, haz clic en su nombre en cualquier evento.
                </p>
              )}
              <Button
                variant="outline-secondary"
                size="sm"
                className="w-100"
                disabled={!hasFilters}
                onClick={() => { setFilters(EMPTY_FILTERS); setBoardFilter(null); }}
              >
                <FiX className="me-1" /> Limpiar filtros
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={9}>
          <Card className="shadow-sm">
            <Card.Header className="bg-transparent d-flex flex-wrap justify-content-between align-items-center gap-2">
              <span className="small text-muted">
                {pagination ? `${pagination.total} eventos` : 'Cargando…'}
              </span>
              {boardFilter && (
                <Badge bg="primary" className="d-inline-flex align-items-center gap-1 fw-normal">
                  {boardFilter.name}
                  <button type="button" className="btn-close btn-close-white" style={{ fontSize: '0.5rem' }} onClick={() => setBoardFilter(null)} aria-label="Quitar filtro de tablero" />
                </Badge>
              )}
            </Card.Header>
            <Card.Body>
              {error && <Alert variant="danger" className="py-2">{error}</Alert>}
              {loading ? (
                <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
              ) : items.length === 0 ? (
                <p className="text-muted text-center py-4 mb-0">No hay eventos con estos filtros.</p>
              ) : (
                <>
                  <ul className="activity-list">
                    {items.map(entry => (
                      <ActivityItem
                        key={entry.id}
                        entry={entry}
                        showTask
                        showBoard={isGlobal}
                        linkTask={!isGlobal}
                        onBoardClick={isGlobal ? (id, name) => setBoardFilter({ id, name }) : undefined}
                      />
                    ))}
                  </ul>
                  {pagination && pagination.page < pagination.totalPages && (
                    <div className="text-center">
                      <Button variant="outline-primary" size="sm" onClick={loadMore} disabled={loadingMore}>
                        {loadingMore ? <Spinner size="sm" animation="border" /> : `Cargar más (${pagination.total - items.length} restantes)`}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </MainLayout>
  );
};

export default ActivityPage;
