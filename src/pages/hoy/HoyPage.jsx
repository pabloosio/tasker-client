import { useState, useEffect, useRef, useCallback } from 'react';
import { Spinner, Alert } from 'react-bootstrap';
import { FiCheck, FiChevronRight, FiPlus, FiSunrise } from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';
import taskService from '../../services/taskService';
import categoryService from '../../services/categoryService';
import { useWorkspace } from '../../context/WorkspaceContext';

// ── Helpers ───────────────────────────────────────────────────────────────────
const toIso = (d) => d.toISOString().split('T')[0];
const today = () => toIso(new Date());
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toIso(d);
};

const DAYS_ES = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const dateLabel = () => {
  const d = new Date();
  return `${DAYS_ES[d.getDay()]} ${d.getDate()} de ${MONTHS_ES[d.getMonth()]}`;
};

// ── Post-it Card ──────────────────────────────────────────────────────────────
const PostitCard = ({ task, onToggleComplete, onMoveToTomorrow }) => {
  const color = task.category?.color || '#94A3B8';
  const done = task.status === 'COMPLETED';

  return (
    <div style={{
      background: done ? '#F9FAFB' : '#fff',
      border: `1px solid ${done ? '#E5E7EB' : color}22`,
      borderTop: `3px solid ${color}`,
      borderRadius: 8,
      padding: '14px 14px 12px',
      width: 200,
      minHeight: 110,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      opacity: done ? 0.55 : 1,
      transition: 'opacity 0.2s',
      flexShrink: 0,
    }}>
      {/* Título */}
      <div>
        <p style={{
          fontSize: 13,
          fontWeight: 600,
          margin: 0,
          lineHeight: 1.45,
          textDecoration: done ? 'line-through' : 'none',
          color: done ? '#9CA3AF' : '#111827',
          wordBreak: 'break-word',
        }}>
          {task.title}
        </p>
        {task.description && (
          <p style={{
            fontSize: 11, color: '#6B7280', margin: '5px 0 0',
            lineHeight: 1.4, wordBreak: 'break-word',
            textDecoration: done ? 'line-through' : 'none',
          }}>
            {task.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        {/* Categoría */}
        <span style={{
          fontSize: 10, color: color, fontWeight: 600,
          background: `${color}18`, borderRadius: 4, padding: '2px 6px',
          maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {task.category?.name || 'Sin cat.'}
        </span>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 4 }}>
          {!done && (
            <button
              title="Mover a mañana"
              onClick={() => onMoveToTomorrow(task)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '2px 3px', fontSize: 12, borderRadius: 4 }}
            >→</button>
          )}
          <button
            title={done ? 'Deshacer' : 'Completar'}
            onClick={() => onToggleComplete(task)}
            style={{
              background: done ? '#F3F4F618' : '#10B98118',
              border: `1px solid ${done ? '#D1D5DB' : '#10B98140'}`,
              cursor: 'pointer',
              color: done ? '#9CA3AF' : '#10B981',
              padding: '2px 6px', fontSize: 11, borderRadius: 4, fontWeight: 700,
            }}
          >
            <FiCheck size={11} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────
const HoyPage = () => {
  const { currentWorkspace } = useWorkspace();
  const [todayTasks,    setTodayTasks]    = useState([]);
  const [overdueTasks,  setOverdueTasks]  = useState([]);
  const [categories,    setCategories]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [quickTitle,    setQuickTitle]    = useState('');
  const [quickDesc,     setQuickDesc]     = useState('');
  const [quickCat,      setQuickCat]      = useState('');
  const [showDesc,      setShowDesc]      = useState(false);
  const [adding,        setAdding]        = useState(false);
  const [showOverdue,   setShowOverdue]   = useState(true);
  const inputRef = useRef(null);

  const wsId = currentWorkspace?.id;

  const fetchTasks = useCallback(async () => {
    if (!wsId) return;
    setLoading(true);
    setError('');
    try {
      const t = today();
      // Tareas de hoy
      const resHoy = await taskService.getTasks({
        workspaceId: wsId,
        dueDateFrom: t,
        dueDateTo: t,
        limit: 100,
      });
      // Tareas atrasadas (dueDate < hoy, no completadas)
      const yesterday = toIso(new Date(new Date().setDate(new Date().getDate() - 1)));
      const resOld = await taskService.getTasks({
        workspaceId: wsId,
        dueDateTo: yesterday,
        limit: 100,
      });
      setTodayTasks(resHoy.data?.tasks || resHoy.tasks || []);
      setOverdueTasks((resOld.data?.tasks || resOld.tasks || []).filter(t => t.status !== 'COMPLETED'));
    } catch {
      setError('No se pudieron cargar las tareas.');
    } finally {
      setLoading(false);
    }
  }, [wsId]);

  // Cargar categorías
  useEffect(() => {
    if (!wsId) return;
    categoryService.getCategories({ workspaceId: wsId })
      .then(res => setCategories(res?.data || []))
      .catch(() => {});
  }, [wsId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // ── Acciones ──
  const handleToggleComplete = async (task) => {
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    setTodayTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      await taskService.updateTaskStatus(task.id, newStatus);
    } catch {
      fetchTasks();
    }
  };

  const handleMoveToTomorrow = async (task) => {
    const tom = tomorrow();
    setTodayTasks(prev => prev.filter(t => t.id !== task.id));
    setOverdueTasks(prev => prev.filter(t => t.id !== task.id));
    try {
      await taskService.updateTask(task.id, { ...task, dueDate: tom, categoryId: task.category?.id || null });
    } catch {
      fetchTasks();
    }
  };

  const handleMoveOverdueToToday = async (task) => {
    const t = today();
    setOverdueTasks(prev => prev.filter(x => x.id !== task.id));
    setTodayTasks(prev => [...prev, { ...task, dueDate: t }]);
    try {
      await taskService.updateTask(task.id, { ...task, dueDate: t, categoryId: task.category?.id || null });
    } catch {
      fetchTasks();
    }
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      const res = await taskService.createTask({
        title,
        description: quickDesc.trim() || null,
        workspaceId: wsId,
        dueDate: today(),
        categoryId: quickCat || null,
        status: 'PENDING',
        priority: 'MEDIUM',
      });
      const newTask = res?.data || res?.task || res;
      setTodayTasks(prev => [...prev, newTask]);
      setQuickTitle('');
      setQuickDesc('');
      setQuickCat('');
      setShowDesc(false);
      inputRef.current?.focus();
    } catch {
      setError('No se pudo agregar la tarea.');
    } finally {
      setAdding(false);
    }
  };

  // ── Stats ──
  const total     = todayTasks.length;
  const completed = todayTasks.filter(t => t.status === 'COMPLETED').length;
  const pending   = todayTasks.filter(t => t.status !== 'COMPLETED');
  const done      = todayTasks.filter(t => t.status === 'COMPLETED');

  return (
    <MainLayout>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* ── Encabezado ── */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          <div>
            <h4 style={{ marginBottom: 2, fontWeight: 700, textTransform: 'capitalize' }}>
              <FiSunrise size={18} className="me-2" style={{ color: '#F59E0B', verticalAlign: 'middle' }} />
              {dateLabel()}
            </h4>
            {!loading && (
              <span style={{ fontSize: 13, color: '#6B7280' }}>
                {completed} de {total} completadas
                {total > 0 && (
                  <span style={{
                    marginLeft: 10, fontSize: 11, fontWeight: 600,
                    color: completed === total && total > 0 ? '#10B981' : '#9CA3AF'
                  }}>
                    {total > 0 ? `${Math.round(completed / total * 100)}%` : ''}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

        {/* ── Quick add ── */}
        {wsId && (
          <form onSubmit={handleQuickAdd} style={{
            marginBottom: 28, background: '#F9FAFB', borderRadius: 8,
            padding: '10px 12px', border: '1px solid #E5E7EB',
          }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                ref={inputRef}
                placeholder="¿Qué vas a hacer hoy? (Enter para agregar)"
                value={quickTitle}
                onChange={e => setQuickTitle(e.target.value)}
                style={{
                  flex: 1, minWidth: 200, border: '1px solid #E5E7EB',
                  borderRadius: 6, padding: '6px 10px', fontSize: 13,
                  outline: 'none', background: '#fff',
                }}
                disabled={adding}
              />
              <select
                value={quickCat}
                onChange={e => setQuickCat(e.target.value)}
                style={{
                  border: '1px solid #E5E7EB', borderRadius: 6, padding: '6px 8px',
                  fontSize: 12, color: '#374151', background: '#fff', minWidth: 120,
                }}
              >
                <option value="">Sin categoría</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowDesc(v => !v)}
                title="Añadir nota"
                style={{
                  background: showDesc ? '#EFF6FF' : 'none',
                  border: `1px solid ${showDesc ? '#BFDBFE' : '#E5E7EB'}`,
                  borderRadius: 6, padding: '6px 10px', fontSize: 12,
                  color: showDesc ? '#3B82F6' : '#9CA3AF', cursor: 'pointer',
                }}
              >
                nota
              </button>
              <button
                type="submit"
                disabled={!quickTitle.trim() || adding}
                style={{
                  background: '#3B82F6', color: '#fff', border: 'none',
                  borderRadius: 6, padding: '6px 14px', fontSize: 13,
                  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  opacity: !quickTitle.trim() ? 0.5 : 1,
                }}
              >
                {adding ? <Spinner animation="border" size="sm" /> : <><FiPlus size={13} />Agregar</>}
              </button>
            </div>
            {showDesc && (
              <textarea
                placeholder="Nota o descripción (opcional)"
                value={quickDesc}
                onChange={e => setQuickDesc(e.target.value)}
                rows={2}
                style={{
                  width: '100%', marginTop: 8, border: '1px solid #E5E7EB',
                  borderRadius: 6, padding: '6px 10px', fontSize: 12,
                  outline: 'none', background: '#fff', resize: 'vertical',
                  color: '#374151',
                }}
              />
            )}
          </form>
        )}

        {loading ? (
          <div className="d-flex justify-content-center py-5">
            <Spinner animation="border" style={{ color: '#6B9FD4' }} />
          </div>
        ) : !wsId ? (
          <p className="text-muted text-center py-5">Seleccioná un tablero para ver las tareas de hoy.</p>
        ) : (
          <>
            {/* ── Tareas de hoy: pendientes ── */}
            {pending.length === 0 && done.length === 0 ? (
              <p className="text-muted text-center py-4" style={{ fontSize: 14 }}>
                No hay tareas programadas para hoy. ¡Agregá una arriba!
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                {pending.map(task => (
                  <PostitCard
                    key={task.id}
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    onMoveToTomorrow={handleMoveToTomorrow}
                  />
                ))}
              </div>
            )}

            {/* ── Completadas de hoy ── */}
            {done.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Completadas hoy ({done.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {done.map(task => (
                    <PostitCard
                      key={task.id}
                      task={task}
                      onToggleComplete={handleToggleComplete}
                      onMoveToTomorrow={handleMoveToTomorrow}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── De días anteriores ── */}
            {overdueTasks.length > 0 && (
              <div>
                <button
                  onClick={() => setShowOverdue(v => !v)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 11, fontWeight: 600, color: '#9CA3AF',
                    textTransform: 'uppercase', letterSpacing: '0.06em', padding: 0, marginBottom: 10,
                  }}
                >
                  <FiChevronRight
                    size={13}
                    style={{ transform: showOverdue ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
                  />
                  De días anteriores ({overdueTasks.length})
                </button>

                {showOverdue && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {overdueTasks.map(task => (
                      <div key={task.id} style={{ position: 'relative' }}>
                        <PostitCard
                          task={task}
                          onToggleComplete={handleToggleComplete}
                          onMoveToTomorrow={handleMoveToTomorrow}
                        />
                        <button
                          onClick={() => handleMoveOverdueToToday(task)}
                          style={{
                            position: 'absolute', top: -8, right: -8,
                            background: '#3B82F6', color: '#fff', border: 'none',
                            borderRadius: '50%', width: 20, height: 20, fontSize: 10,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                          }}
                          title="Traer a hoy"
                        >↑</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default HoyPage;
