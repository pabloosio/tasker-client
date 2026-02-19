import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import workspaceService from '../services/workspaceService';
import api from '../services/api';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
  const { isAuthenticated, user, updateUser } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    if (!isAuthenticated) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await workspaceService.getWorkspaces();
      const data = response.data || response;
      const list = Array.isArray(data) ? data : [];
      setWorkspaces(list);

      // Usar workspace fijado como default; si no hay, usar el personal
      const pinned = user?.pinnedWorkspaceId && list.find(w => w.id === user.pinnedWorkspaceId);
      const personal = list.find(w => w.isPersonal);
      setCurrentWorkspace(pinned || personal || list[0] || null);
    } catch (err) {
      console.error('Error fetching workspaces:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.pinnedWorkspaceId]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const switchWorkspace = (workspace) => {
    setCurrentWorkspace(workspace);
  };

  const pinWorkspace = async (workspaceId) => {
    // Si ya está fijado, desfijar (null); si no, fijar
    const newPinId = user?.pinnedWorkspaceId === workspaceId ? null : workspaceId;
    try {
      await api.put('/users/profile', { pinnedWorkspaceId: newPinId });
      updateUser({ pinnedWorkspaceId: newPinId });
    } catch (err) {
      console.error('Error al fijar workspace:', err);
    }
  };

  const value = {
    workspaces,
    currentWorkspace,
    switchWorkspace,
    pinWorkspace,
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
