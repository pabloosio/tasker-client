import { Link } from 'react-router-dom';
import { describeActivity } from '../../utils/activityFormat';
import { formatTaskKey } from '../../utils/taskKey';
import { humanizeDate, formatDateTime } from '../../utils/dateUtils';
import './Activity.css';

/**
 * Un evento en la línea de tiempo.
 * showTask: mostrar la tarea (en la actividad del tablero; no dentro de la propia tarea)
 * showBoard: mostrar el tablero (auditoría global); onBoardClick filtra por ese tablero
 * linkTask: enlazar a la tarea (no en la auditoría global: el admin no necesariamente es miembro)
 */
const ActivityItem = ({ entry, showTask = false, showBoard = false, onBoardClick, linkTask = true }) => {
  const { text, tone, details } = describeActivity(entry);
  const actorName = entry.actor?.name || 'Usuario eliminado';
  const deleted = entry.action === 'TASK_DELETED';

  return (
    <li className={`activity-item tone-${tone}`}>
      <span className="activity-dot" />
      <div className="activity-body">
        <div className="activity-text">
          <strong>{actorName}</strong> {text}
          {showTask && entry.taskNumber && (
            <>
              {' · '}
              {deleted || !linkTask ? (
                <span className={`activity-task ${deleted ? 'is-deleted' : 'is-plain'}`} title={deleted ? 'Tarea eliminada' : undefined}>
                  <span className="task-key">{formatTaskKey(entry.taskNumber)}</span> {entry.taskTitle}
                </span>
              ) : (
                <Link to={`/t/${entry.taskNumber}`} className="activity-task">
                  <span className="task-key">{formatTaskKey(entry.taskNumber)}</span> {entry.taskTitle}
                </Link>
              )}
            </>
          )}
        </div>
        {details?.length > 0 && (
          <ul className="activity-details">
            {details.map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        )}
        <div className="activity-meta">
          <span title={formatDateTime(entry.createdAt)}>{humanizeDate(entry.createdAt)} · {formatDateTime(entry.createdAt)}</span>
          {showBoard && entry.workspaceName && (
            onBoardClick && entry.workspaceId ? (
              <button type="button" className="activity-board" onClick={() => onBoardClick(entry.workspaceId, entry.workspaceName)}>
                {entry.workspaceName}
              </button>
            ) : (
              <span>{entry.workspaceName}</span>
            )
          )}
        </div>
      </div>
    </li>
  );
};

export default ActivityItem;
