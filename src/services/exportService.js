import api from './api';

const exportService = {
  /**
   * Descargar tareas en formato Excel
   */
  downloadExcel: async () => {
    const response = await api.get('/export/excel', {
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'tareas.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Descargar tareas en formato PDF
   */
  downloadPdf: async () => {
    const response = await api.get('/export/pdf', {
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'tareas.pdf');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};

export default exportService;
