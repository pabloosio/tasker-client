import api from './api';

const profileService = {
  // Resumen: datos de la cuenta, tableros con mi rol y mis números
  getSummary: async () => {
    const response = await api.get('/users/profile/summary');
    return response.data;
  },

  // Editar nombre (o tablero predeterminado)
  updateProfile: async (data) => {
    const response = await api.put('/users/profile', data);
    return response.data;
  },

  // Cambiar contraseña
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.put('/users/profile/password', { currentPassword, newPassword });
    return response.data;
  }
};

export default profileService;
