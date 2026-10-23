import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Spinner } from 'react-bootstrap';
import { FiLock, FiSearch } from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';
import taskService from '../../services/taskService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatTaskKey, parseTaskKey } from '../../utils/taskKey';

/**
 * Enlace directo /t/000142: abre la tarea en su tablero (si tienes acceso).
 */
const TaskLinkPage = () => {
  const { number: rawNumber } = useParams();
  const navigate = useNavigate();
  const { workspaces, switchWorkspace, loading: workspacesLoading } = useWorkspace();
  const number = parseTaskKey(rawNumber);
  const [error, setError] = useState(number ? null : 'invalid');

  useEffect(() => {
    if (!number || workspacesLoading) return;
    let cancelled = false;

    taskService.getTaskByNumber(number)
      .then((response) => {
        if (cancelled) return;
        const task = response.data;
        const workspace = (workspaces || []).find(w => w.id === task.workspaceId);
        if (workspace) switchWorkspace(workspace);
        navigate(`/dashboard?task=${task.id}`, { replace: true });
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.status === 403 ? 'forbidden' : 'notFound');
      });

    return () => { cancelled = true; };
  }, [number, workspacesLoading]);

  const key = number ? formatTaskKey(number) : rawNumber;
  const messages = {
    invalid: { icon: FiSearch, title: `"${rawNumber}" no es un ID de tarea válido`, text: 'Los IDs tienen el formato #000142.' },
    notFound: { icon: FiSearch, title: `La tarea ${key} no existe`, text: 'Puede que se haya eliminado o que el ID esté mal escrito.' },
    forbidden: { icon: FiLock, title: `No tienes acceso a la tarea ${key}`, text: 'Pertenece a un tablero del que no eres miembro. Pide a su propietario o a un administrador que te invite.' }
  };

  if (!error) {
    return (
      <MainLayout>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Abriendo la tarea {key}…</p>
        </div>
      </MainLayout>
    );
  }

  const { icon: Icon, title, text } = messages[error];
  return (
    <MainLayout>
      <Card className="shadow-sm border-0 mx-auto mt-4" style={{ maxWidth: 520 }}>
        <Card.Body className="text-center py-5">
          <Icon size={36} className="text-muted mb-3" />
          <h5 className="mb-2">{title}</h5>
          <p className="text-muted mb-4">{text}</p>
          <Link to="/dashboard" className="btn btn-primary">Ir a mis tableros</Link>
        </Card.Body>
      </Card>
    </MainLayout>
  );
};

export default TaskLinkPage;
