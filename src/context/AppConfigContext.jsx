import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

/**
 * Funcionalidades habilitadas en el servidor (GET /config).
 * Si la petición falla, todo lo opcional queda deshabilitado y la app sigue funcionando.
 */
const DISABLED = { attachments: { enabled: false, maxFileMb: 0, maxPerTask: 0, maxPerRequest: 0, extensions: [] } };

const AppConfigContext = createContext(DISABLED);

export const AppConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(DISABLED);

  useEffect(() => {
    api.get('/config')
      .then((res) => setConfig({ ...DISABLED, ...res.data?.data }))
      .catch(() => setConfig(DISABLED));
  }, []);

  return <AppConfigContext.Provider value={config}>{children}</AppConfigContext.Provider>;
};

export const useAppConfig = () => useContext(AppConfigContext);

/** Atajo: configuración de adjuntos ({ enabled, maxFileMb, maxPerTask, maxPerRequest, extensions }) */
export const useAttachmentsConfig = () => useContext(AppConfigContext).attachments;
