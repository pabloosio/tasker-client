import api from './api';

const parseContentDispositionFilename = (contentDisposition) => {
  if (!contentDisposition) return null;
  // Ej: attachment; filename=tareas.pdf  | attachment; filename="tareas.pdf"
  const match = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)"?/i);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

const extractBlobErrorMessage = async (err) => {
  const status = err?.response?.status;
  const data = err?.response?.data;

  // Cuando responseType='blob', los errores del backend llegan como Blob (JSON)
  if (data instanceof Blob) {
    const text = await data.text().catch(() => '');
    if (text) {
      try {
        const json = JSON.parse(text);
        if (json?.message) {
          return { message: json.message, details: { status, ...json } };
        }
        return { message: text, details: { status, raw: text } };
      } catch {
        return { message: text, details: { status, raw: text } };
      }
    }
  }

  const message = err?.response?.data?.message || err?.message || 'Error desconocido';
  return { message, details: { status } };
};

const exportService = {
  /**
   * Descargar tareas en formato Excel
   */
  downloadExcel: async () => {
    try {
      const response = await api.get('/export/excel', { responseType: 'blob' });

      // Si el backend responde JSON (error) pero viene como blob, lo detectamos por header
      const contentType = response.headers?.['content-type'] || '';
      if (contentType.includes('application/json')) {
        const text = await response.data.text();
        const json = JSON.parse(text);
        throw new Error(json?.message || 'Error al generar Excel');
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename =
        parseContentDispositionFilename(response.headers?.['content-disposition']) || 'tareas.xlsx';
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const { message, details } = await extractBlobErrorMessage(err);
      const enhanced = new Error(message || 'Error al descargar el archivo Excel');
      enhanced.details = { endpoint: '/export/excel', ...details };
      throw enhanced;
    }
  },

  /**
   * Descargar tareas en formato PDF
   */
  downloadPdf: async () => {
    try {
      const response = await api.get('/export/pdf', { responseType: 'blob' });

      // Si el backend responde JSON (error) pero viene como blob, lo detectamos por header
      const contentType = response.headers?.['content-type'] || '';
      if (contentType.includes('application/json')) {
        const text = await response.data.text();
        const json = JSON.parse(text);
        throw new Error(json?.message || 'Error al generar PDF');
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename =
        parseContentDispositionFilename(response.headers?.['content-disposition']) || 'tareas.pdf';
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const { message, details } = await extractBlobErrorMessage(err);
      const enhanced = new Error(message || 'Error al descargar el archivo PDF');
      enhanced.details = { endpoint: '/export/pdf', ...details };
      throw enhanced;
    }
  }
};

export default exportService;
