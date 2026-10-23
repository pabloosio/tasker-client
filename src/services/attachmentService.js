import api from './api';

const attachmentService = {
  list: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}/attachments`);
    return response.data;
  },

  /**
   * Sube archivos (campo "files"). onProgress recibe 0-100.
   * El Content-Type multipart es necesario: la instancia de axios manda JSON por defecto.
   */
  upload: async (taskId, files, onProgress) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file, file.name));

    const response = await api.post(`/tasks/${taskId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    return response.data;
  },

  /** URL temporal; inline = abrir en el navegador (imágenes, PDF) en vez de descargar */
  getUrl: async (taskId, attachmentId, { inline = false } = {}) => {
    const response = await api.get(`/tasks/${taskId}/attachments/${attachmentId}/download`, {
      params: inline ? { inline: 1 } : undefined
    });
    return response.data.data.url;
  },

  remove: async (taskId, attachmentId) => {
    const response = await api.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
    return response.data;
  }
};

export default attachmentService;
