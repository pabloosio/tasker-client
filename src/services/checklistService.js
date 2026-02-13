import api from './api';

const checklistService = {
  getItems: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}/checklist`);
    return response.data;
  },

  addItem: async (taskId, content) => {
    const response = await api.post(`/tasks/${taskId}/checklist`, { content });
    return response.data;
  },

  toggleItem: async (taskId, itemId) => {
    const response = await api.patch(`/tasks/${taskId}/checklist/${itemId}`);
    return response.data;
  },

  deleteItem: async (taskId, itemId) => {
    const response = await api.delete(`/tasks/${taskId}/checklist/${itemId}`);
    return response.data;
  }
};

export default checklistService;
