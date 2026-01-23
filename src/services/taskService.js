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

  // Actualizar estado de tarea
  updateTaskStatus: async (id, status) => {
    const response = await api.patch(`/tasks/${id}/status`, { status });
    return response. data;
  },

  // Eliminar tarea
  deleteTask: async (id) => {
    const response = await api. delete(`/tasks/${id}`);
    return response.data;
  },

  // Obtener estadísticas
  getStats: async () => {
    const response = await api.get('/tasks/stats');
    return response. data;
  }
};

export default taskService;