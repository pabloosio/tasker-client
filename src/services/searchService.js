import api from './api';

const searchService = {
  // Búsqueda global en tareas, tableros y categorías a los que tengo acceso
  search: async (q, { signal } = {}) => {
    const response = await api.get('/search', { params: { q }, signal });
    return response.data;
  }
};

export default searchService;
