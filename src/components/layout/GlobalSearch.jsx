import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Spinner } from 'react-bootstrap';
import { FiSearch, FiCheckSquare, FiBriefcase, FiFolder, FiCornerDownLeft } from 'react-icons/fi';
import searchService from '../../services/searchService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatDate } from '../../utils/dateUtils';
import { formatTaskKey, parseTaskKey } from '../../utils/taskKey';
import { OPEN_SEARCH_EVENT } from './navItems';
import './GlobalSearch.css';

const STATUS_LABELS = {
  BACKLOG: 'Backlog',
  PENDING: 'Por hacer',
  IN_PROGRESS: 'En Progreso',
  IN_REVIEW: 'En Revisión',
  COMPLETED: 'Completada'
};

const MIN_CHARS = 2;
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * Buscador global (Ctrl/⌘ + K). La API solo devuelve resultados de los tableros
 * donde el usuario es miembro.
 */
const GlobalSearch = () => {
  const navigate = useNavigate();
  const { workspaces, switchWorkspace } = useWorkspace();
  const [show, setShow] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef(null);

  // Atajo de teclado
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShow(true);
      }
    };
    const onOpen = () => setShow(true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  // Buscar con debounce; cancelar la petición anterior si siguen escribiendo
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_CHARS && !parseTaskKey(q)) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await searchService.search(q, { signal: controller.signal });
        setResults(response.data);
        setActiveIndex(0);
      } catch (err) {
        if (err.name !== 'CanceledError') setResults({ tasks: [], workspaces: [], categories: [] });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const close = () => {
    setShow(false);
    setQuery('');
    setResults(null);
  };

  const goToWorkspace = (workspaceId, path) => {
    const workspace = (workspaces || []).find(w => w.id === workspaceId);
    if (workspace) switchWorkspace(workspace);
    navigate(path);
    close();
  };

  // Con menos de MIN_CHARS letras no se muestran resultados (aunque haya de una búsqueda anterior)
  // Un número (aunque sea de 1 dígito) se busca como ID de tarea
  const hasQuery = query.trim().length >= MIN_CHARS || !!parseTaskKey(query);
  const visibleResults = hasQuery ? results : null;

  // Lista plana para navegar con flechas
  const items = visibleResults ? [
    ...visibleResults.tasks.map(task => ({
      key: `t-${task.id}`,
      type: 'task',
      data: task,
      open: () => goToWorkspace(task.workspaceId, `/tablero?task=${task.id}`)
    })),
    ...visibleResults.workspaces.map(ws => ({
      key: `w-${ws.id}`,
      type: 'workspace',
      data: ws,
      open: () => goToWorkspace(ws.id, '/tablero')
    })),
    ...visibleResults.categories.map(cat => ({
      key: `c-${cat.id}`,
      type: 'category',
      data: cat,
      open: () => goToWorkspace(cat.workspaceId, '/categories')
    }))
  ] : [];

  const handleKeyDown = (e) => {
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      items[activeIndex]?.open();
    }
  };

  // Mantener visible el elemento activo
  useEffect(() => {
    listRef.current?.querySelector('.gs-item.active')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const renderItem = (item, index) => {
    const active = index === activeIndex;
    const common = {
      key: item.key,
      type: 'button',
      className: `gs-item ${active ? 'active' : ''}`,
      onClick: item.open,
      onMouseEnter: () => setActiveIndex(index)
    };

    if (item.type === 'task') {
      const task = item.data;
      return (
        <button {...common}>
          <FiCheckSquare className="gs-item-icon" />
          <div className="gs-item-body">
            <div className={`gs-item-title ${task.status === 'COMPLETED' ? 'is-done' : ''}`}>
              <span className="task-key me-2">{formatTaskKey(task.number)}</span>
              {task.title}
            </div>
            <div className="gs-item-meta">
              <span>{task.workspace?.name || 'Sin tablero'}</span>
              <span className={`gs-status gs-status-${task.status.toLowerCase()}`}>{STATUS_LABELS[task.status]}</span>
              {task.category && (
                <span className="d-inline-flex align-items-center gap-1">
                  <span className="gs-dot" style={{ background: task.category.color }} />
                  {task.category.name}
                </span>
              )}
              {task.assignee && <span>{task.assignee.name}</span>}
              {task.dueDate && <span>{formatDate(task.dueDate)}</span>}
            </div>
          </div>
          {active && <FiCornerDownLeft className="gs-enter" />}
        </button>
      );
    }

    if (item.type === 'workspace') {
      return (
        <button {...common}>
          <FiBriefcase className="gs-item-icon" />
          <div className="gs-item-body">
            <div className="gs-item-title">{item.data.name}</div>
            {item.data.description && <div className="gs-item-meta"><span>{item.data.description}</span></div>}
          </div>
          {active && <FiCornerDownLeft className="gs-enter" />}
        </button>
      );
    }

    return (
      <button {...common}>
        <FiFolder className="gs-item-icon" style={{ color: item.data.color }} />
        <div className="gs-item-body">
          <div className="gs-item-title">{item.data.name}</div>
          <div className="gs-item-meta"><span>Categoría · {item.data.workspace?.name || 'Sin tablero'}</span></div>
        </div>
        {active && <FiCornerDownLeft className="gs-enter" />}
      </button>
    );
  };

  const sections = [
    { type: 'task', title: 'Tareas' },
    { type: 'workspace', title: 'Tableros' },
    { type: 'category', title: 'Categorías' }
  ];

  return (
    <>
      <button type="button" className="gs-trigger" onClick={() => setShow(true)} title="Buscar (Ctrl/⌘ + K)">
        <FiSearch />
        <span className="gs-trigger-text">Buscar</span>
        <kbd className="gs-trigger-kbd">{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>

      <Modal show={show} onHide={close} dialogClassName="gs-modal" contentClassName="gs-content">
        <div className="gs-input-wrap">
          <FiSearch className="gs-input-icon" />
          <input
            className="gs-input"
            autoFocus
            placeholder="Buscar por ID (#000142), tarea, tablero, categoría o persona…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Buscar"
          />
          {loading && hasQuery && <Spinner animation="border" size="sm" className="text-muted" />}
        </div>

        <div className="gs-results" ref={listRef}>
          {!hasQuery ? (
            <p className="gs-hint">Escribe el ID de una tarea (ej. 142) o al menos {MIN_CHARS} letras. Solo verás resultados de los tableros donde eres miembro.</p>
          ) : visibleResults && items.length === 0 && !loading ? (
            <p className="gs-hint">Sin resultados para “{query.trim()}”.</p>
          ) : (
            sections.map(section => {
              const sectionItems = items
                .map((item, index) => ({ item, index }))
                .filter(({ item }) => item.type === section.type);
              if (!sectionItems.length) return null;
              return (
                <div key={section.type} className="gs-section">
                  <div className="gs-section-title">{section.title}</div>
                  {sectionItems.map(({ item, index }) => renderItem(item, index))}
                </div>
              );
            })
          )}
        </div>

        <div className="gs-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
          <span><kbd>Enter</kbd> abrir</span>
          <span><kbd>Esc</kbd> cerrar</span>
        </div>
      </Modal>
    </>
  );
};

export default GlobalSearch;
