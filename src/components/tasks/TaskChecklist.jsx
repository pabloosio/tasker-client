import { useState, useEffect } from 'react';
import { Form, Button, ProgressBar, Spinner } from 'react-bootstrap';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import checklistService from '../../services/checklistService';
import './TaskChecklist.css';

const TaskChecklist = ({ taskId, onProgressChange }) => {
  const [items, setItems] = useState([]);
  const [newContent, setNewContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const completed = items.filter((i) => i.isCompleted).length;
  const total = items.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  useEffect(() => {
    loadItems();
  }, [taskId]);

  useEffect(() => {
    if (onProgressChange) {
      onProgressChange({ completed, total });
    }
  }, [completed, total]);

  const loadItems = async () => {
    try {
      const response = await checklistService.getItems(taskId);
      setItems(response.data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setAdding(true);
    try {
      const response = await checklistService.addItem(taskId, newContent.trim());
      setItems((prev) => [...prev, response.data]);
      setNewContent('');
    } catch {
      // error silencioso, el item no se agrega
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (itemId) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, isCompleted: !item.isCompleted, completedAt: !item.isCompleted ? new Date().toISOString() : null }
          : item
      )
    );
    try {
      await checklistService.toggleItem(taskId, itemId);
    } catch {
      loadItems(); // revert on error
    }
  };

  const handleDelete = async (itemId) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    try {
      await checklistService.deleteItem(taskId, itemId);
    } catch {
      loadItems(); // revert on error
    }
  };

  if (loading) {
    return (
      <div className="text-center py-3">
        <Spinner animation="border" size="sm" />
      </div>
    );
  }

  return (
    <div className="task-checklist">
      <div className="checklist-header">
        <span className="checklist-title">Subtareas</span>
        {total > 0 && (
          <span className="checklist-count">{completed}/{total}</span>
        )}
      </div>

      {total > 0 && (
        <ProgressBar
          now={percent}
          variant={percent === 100 ? 'success' : 'primary'}
          className="checklist-progress mb-2"
        />
      )}

      <div className="checklist-items">
        {items.map((item) => (
          <div key={item.id} className={`checklist-item ${item.isCompleted ? 'completed' : ''}`}>
            <Form.Check
              type="checkbox"
              checked={item.isCompleted}
              onChange={() => handleToggle(item.id)}
              className="checklist-checkbox"
            />
            <span className="checklist-item-text" onClick={() => handleToggle(item.id)} style={{ cursor: 'pointer' }}>{item.content}</span>
            <button
              type="button"
              className="checklist-delete-btn"
              onClick={() => handleDelete(item.id)}
              title="Eliminar"
            >
              <FiTrash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="checklist-add-form">
        <Form.Control
          type="text"
          size="sm"
          placeholder="Agregar ítem..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          maxLength={500}
          disabled={adding}
        />
        <Button
          type="submit"
          size="sm"
          variant="outline-primary"
          disabled={!newContent.trim() || adding}
          className="checklist-add-btn"
        >
          {adding ? <Spinner animation="border" size="sm" /> : <FiPlus size={14} />}
        </Button>
      </form>
    </div>
  );
};

export default TaskChecklist;
