import api from './api';

const parseFilename = (contentDisposition) => {
  if (!contentDisposition) return null;
  const match = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)"?/i);
  if (!match?.[1]) return null;
  try { return decodeURIComponent(match[1]); } catch { return match[1]; }
};

const extractError = async (err) => {
  const status = err?.response?.status;
  const data   = err?.response?.data;
  if (data instanceof Blob) {
    const text = await data.text().catch(() => '');
    if (text) {
      try {
        const json = JSON.parse(text);
        if (json?.message) return { message: json.message, details: { status, ...json } };
      } catch { /* not json */ }
      return { message: text, details: { status } };
    }
  }
  return { message: err?.response?.data?.message || err?.message || 'Error desconocido', details: { status } };
};

const buildParams = ({ startDate, endDate, workspaceId, categoryIds } = {}) => {
  const p = {};
  if (startDate)               p.startDate   = startDate;
  if (endDate)                 p.endDate     = endDate;
  if (workspaceId)             p.workspaceId = workspaceId;
  if (categoryIds?.length > 0) p.categoryIds = categoryIds.join(',');
  return p;
};

const download = async (endpoint, defaultFilename, filters = {}) => {
  try {
    const response = await api.get(endpoint, { responseType: 'blob', params: buildParams(filters) });
    const contentType = response.headers?.['content-type'] || '';
    if (contentType.includes('application/json')) {
      const text = await response.data.text();
      const json = JSON.parse(text);
      throw new Error(json?.message || 'Error al generar el archivo');
    }
    const url  = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href  = url;
    link.setAttribute('download', parseFilename(response.headers?.['content-disposition']) || defaultFilename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    const { message, details } = await extractError(err);
    const e = new Error(message);
    e.details = { endpoint, ...details };
    throw e;
  }
};

const exportService = {
  downloadExcel: (filters = {}) => download('/export/excel', 'reporte.xlsx', filters),
  downloadPdf:   (filters = {}) => download('/export/pdf',   'reporte.pdf',  filters),

  getReport: async (filters = {}) => {
    const response = await api.get('/export/report', { params: buildParams(filters) });
    return response.data?.data || null;
  }
};

export default exportService;
