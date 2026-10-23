import { useEffect } from 'react';
import { FiImage, FiFileText, FiFile, FiArchive, FiGrid, FiMonitor } from 'react-icons/fi';

/**
 * Utilidades de archivos adjuntos: tamaños legibles, icono por tipo y validación previa.
 * La validación real la hace la API; esto solo evita esperar una subida que va a fallar.
 */

export const getExtension = (name = '') => {
  const dot = name.lastIndexOf('.');
  return dot > -1 ? name.slice(dot + 1).toLowerCase() : '';
};

export const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.0', '')} MB`;
};

// Tipo visual por extensión: icono, color y etiqueta corta
const TYPES = {
  image: { icon: FiImage, color: '#6F63C6', label: 'Imagen' },
  pdf: { icon: FiFileText, color: '#DC2626', label: 'PDF' },
  word: { icon: FiFileText, color: '#2563EB', label: 'Word' },
  excel: { icon: FiGrid, color: '#16A34A', label: 'Excel' },
  powerpoint: { icon: FiMonitor, color: '#EA580C', label: 'PowerPoint' },
  text: { icon: FiFileText, color: '#64748B', label: 'Texto' },
  zip: { icon: FiArchive, color: '#A16207', label: 'ZIP' },
  other: { icon: FiFile, color: '#64748B', label: 'Archivo' }
};

const EXT_TYPE = {
  jpg: 'image', jpeg: 'image', png: 'image', webp: 'image', gif: 'image',
  pdf: 'pdf',
  doc: 'word', docx: 'word',
  xls: 'excel', xlsx: 'excel', csv: 'excel',
  ppt: 'powerpoint', pptx: 'powerpoint',
  txt: 'text',
  zip: 'zip'
};

export const getFileType = (name) => TYPES[EXT_TYPE[getExtension(name)] || 'other'];

export const isImage = (name) => EXT_TYPE[getExtension(name)] === 'image';
export const isPdf = (name) => getExtension(name) === 'pdf';
/** Se puede ver dentro de la app (visor); el resto solo se descarga */
export const isPreviewable = (name) => isImage(name) || isPdf(name);

/** Texto para el usuario con los tipos permitidos */
export const ALLOWED_TYPES_LABEL = 'imágenes, PDF, Word, Excel, PowerPoint, CSV, TXT o ZIP';

/**
 * Separa archivos válidos de los rechazados, con mensajes claros.
 * @param {File[]} files
 * @param {object} config   - useAttachmentsConfig()
 * @param {number} current  - archivos que ya tiene la tarea (o pendientes)
 * @returns {{ accepted: File[], errors: string[] }}
 */
export const validateFiles = (files, config, current = 0) => {
  const accepted = [];
  const errors = [];
  const maxBytes = config.maxFileMb * 1024 * 1024;

  for (const file of files) {
    const ext = getExtension(file.name);
    if (!config.extensions.includes(ext)) {
      errors.push(`"${file.name}" no se puede subir. Solo se permiten ${ALLOWED_TYPES_LABEL}.`);
    } else if (file.size > maxBytes) {
      errors.push(`"${file.name}" pesa ${formatFileSize(file.size)}; el máximo es ${config.maxFileMb} MB.`);
    } else if (file.size === 0) {
      errors.push(`"${file.name}" está vacío.`);
    } else if (current + accepted.length >= config.maxPerTask) {
      errors.push(`Solo se permiten ${config.maxPerTask} archivos por tarea; "${file.name}" no se agregó.`);
    } else {
      accepted.push(file);
    }
  }
  return { accepted, errors };
};

/** Nombre para capturas pegadas con Ctrl+V (llegan como "image.png") */
export const nameForPastedFile = (file) => {
  if (file.name && file.name !== 'image.png') return file;
  const stamp = new Date().toLocaleString('sv-SE').replace(/[: ]/g, '-');
  const ext = file.type.split('/')[1] || 'png';
  return new File([file], `captura-${stamp}.${ext}`, { type: file.type });
};

/** Inicia la descarga de una URL firmada (la API ya manda Content-Disposition: attachment) */
export const triggerDownload = (url) => {
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
};

/**
 * Mientras esté montado (un modal de tarea abierto), soltar un archivo fuera de la zona
 * de archivos no hace nada. Sin esto el navegador abre el archivo y se pierde el formulario.
 */
export const usePreventFileDrop = () => {
  useEffect(() => {
    const prevent = (e) => {
      if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
    };
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);
};
