import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import workspaceService from '../services/workspaceService';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    if (!isAuthenticated) {
      // Limpiar estado al cerrar sesión
      setWorkspaces([]);
      setCurrentWorkspace(null);
      localStorage.removeItem('currentWorkspaceId');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await workspaceService.getWorkspaces();
      const data = response.data || response;
      const list = Array.isArray(data) ? data : [];
      setWorkspaces(list);

      // Restaurar workspace guardado o usar Personal por defecto
      const savedId = localStorage.getItem('currentWorkspaceId');
      const saved = savedId && list.find(w => w.id === savedId);
      const personal = list.find(w => w.isPersonal);

      setCurrentWorkspace(saved || personal || list[0] || null);
    } catch (err) {
      console.error('Error fetching workspaces:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const switchWorkspace = (workspace) => {
    setCurrentWorkspace(workspace);
    localStorage.setItem('currentWorkspaceId', workspace.id);
  };

  const value = {
    workspaces,
    currentWorkspace,
    switchWorkspace,
    loading,
    refreshWorkspaces: fetchWorkspaces
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace debe ser usado dentro de un WorkspaceProvider');
  }
  return context;
};
