import api from './api';

const adminService = {
  // Obtener lista de usuarios con filtros
  getUsers: async (filters = {}) => {
    const params = new URLSearchParams();

    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.email) params.append('email', filters.email);
    if (filters.role) params.append('role', filters.role);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive);
    if (filters.emailVerified !== undefined) params.append('emailVerified', filters.emailVerified);

    const response = await api.get(`/admin/users?${params.toString()}`);
    return response.data;
  },

  // Cambiar email de usuario
  updateUserEmail: async (userId, email) => {
    const response = await api.patch(`/admin/users/${userId}/email`, { email });
    return response.data;
  },

  // Activar o desactivar usuario
  toggleUserActive: async (userId, isActive) => {
    const response = await api.patch(`/admin/users/${userId}/active`, { isActive });
    return response.data;
  },

  // Verificar email manualmente
  verifyUserEmail: async (userId) => {
    const response = await api.post(`/admin/users/${userId}/verify-email`);
    return response.data;
  },

  // Cambiar rol de usuario
  updateUserRole: async (userId, role) => {
    const response = await api.patch(`/admin/users/${userId}/role`, { role });
    return response.data;
  }
};

export default adminService;
