import api from './api';

// Quita filtros vacíos para no mandarlos como "?actorId=&group="
const clean = (filters = {}) =>
  Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined));

const activityService = {
  // Historial de una tarea (cualquier miembro con acceso)
  getTaskActivity: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}/activity`);
    return response.data;
  },

  // Actividad de un tablero (Propietario/Administradores)
  getWorkspaceActivity: async (workspaceId, filters) => {
    const response = await api.get(`/workspaces/${workspaceId}/activity`, { params: clean(filters) });
    return response.data;
  },

  // Auditoría global (administradores de la plataforma)
  getGlobalActivity: async (filters) => {
    const response = await api.get('/admin/activity', { params: clean(filters) });
    return response.data;
  }
};

export default activityService;
