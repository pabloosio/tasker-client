import api from './api';

const categoryService = {
  // Obtener todas las categorías
  getCategories: async () => {
    const response = await api.get('/categories');
    return response.data;
  },

  // Obtener categoría por ID
  getCategoryById:  async (id) => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  // Crear categoría
  createCategory: async (categoryData) => {
    const response = await api.post('/categories', categoryData);
    return response.data;
  },

  // Actualizar categoría
  updateCategory: async (id, categoryData) => {
    const response = await api.put(`/categories/${id}`, categoryData);
    return response.data;
  },

  // Eliminar categoría
  deleteCategory: async (id) => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  }
};

export default categoryService;