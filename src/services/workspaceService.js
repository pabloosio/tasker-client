import api from './api';

const workspaceService = {
  getWorkspaces: async () => {
    const response = await api.get('/workspaces');
    return response.data;
  },

  getWorkspaceById: async (id) => {
    const response = await api.get(`/workspaces/${id}`);
    return response.data;
  },

  createWorkspace: async (data) => {
    const response = await api.post('/workspaces', data);
    return response.data;
  },

  updateWorkspace: async (id, data) => {
    const response = await api.put(`/workspaces/${id}`, data);
    return response.data;
  },

  deleteWorkspace: async (id) => {
    const response = await api.delete(`/workspaces/${id}`);
    return response.data;
  },

  getMembers: async (workspaceId) => {
    const response = await api.get(`/workspaces/${workspaceId}/members`);
    return response.data;
  },

  getActiveUsers: async () => {
    const response = await api.get('/users/active');
    return response.data;
  },

  inviteMember: async (workspaceId, userId, role = 'MEMBER') => {
    const response = await api.post(`/workspaces/${workspaceId}/members`, { userId, role });
    return response.data;
  },

  removeMember: async (workspaceId, memberId) => {
    const response = await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
    return response.data;
  },

  updateMemberRole: async (workspaceId, memberId, role) => {
    const response = await api.put(`/workspaces/${workspaceId}/members/${memberId}/role`, { role });
    return response.data;
  }
};

export default workspaceService;
