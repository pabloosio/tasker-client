import api from './api';

const commentService = {
  list: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}/comments`);
    return response.data;
  },

  create: async (taskId, content) => {
    const response = await api.post(`/tasks/${taskId}/comments`, { content });
    return response.data;
  },

  update: async (taskId, commentId, content) => {
    const response = await api.patch(`/tasks/${taskId}/comments/${commentId}`, { content });
    return response.data;
  },

  /** Miembros del tablero que se pueden @mencionar: { members, canInvite, workspaceId } */
  mentionable: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}/mentionable`);
    return response.data;
  },

  remove: async (taskId, commentId) => {
    const response = await api.delete(`/tasks/${taskId}/comments/${commentId}`);
    return response.data;
  }
};

export default commentService;
