import api from './api';

const taskService = {
  // Obtener todas las tareas
  getTasks: async (params = {}) => {
    const response = await api.get('/tasks', { params });
    return response.data;
  },

  // Obtener una tarea por ID
  getTaskById: async (id) => {
    const response = await api. get(`/tasks/${id}`);
    return response.data;
  },

  // Crear tarea
  createTask: async (taskData) => {
    const response = await api.post('/tasks', taskData);
    return response. data;
  },

  // Actualizar tarea
  updateTask: async (id, taskData) => {
    const response = await api.put(`/tasks/${id}`, taskData);
    return response.data;
  },

  // Tablero Kanban completo (sin tope de paginación) + conteo de archivadas y límites WIP
  getBoard: async (workspaceId) => {
    const response = await api.get('/tasks/board', { params: { workspaceId } });
    return response.data;
  },

  // Obtener tarea por su número legible (142, #142 o #000142)
  getTaskByNumber: async (number) => {
    const response = await api.get(`/tasks/by-number/${encodeURIComponent(number)}`);
    return response.data;
  },

  // Tareas asignadas al usuario en todos sus tableros
  getMyTasks: async () => {
    const response = await api.get('/tasks/mine');
    return response.data;
  },

  // Actualizar estado (y opcionalmente la posición dentro de la columna)
  updateTaskStatus: async (id, status, position) => {
    const response = await api.patch(`/tasks/${id}/status`, position === undefined ? { status } : { status, position });
    return response. data;
  },

  // Eliminar tarea
  deleteTask: async (id) => {
    const response = await api. delete(`/tasks/${id}`);
    return response.data;
  },

  // Obtener estadísticas
  getStats: async (params = {}) => {
    const response = await api.get('/tasks/stats', { params });
    return response.data;
  },

  // Obtener reporte semanal de productividad
  getWeeklyReport: async (params = {}) => {
    const response = await api.get('/tasks/weekly-report', { params });
    return response.data;
  }
};

export default taskService;