import api from './api';

const notificationService = {
  /** { items, unreadCount } */
  list: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },

  unreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data.data.unreadCount;
  },

  markRead: async (id) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllRead: async () => {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  }
};

export default notificationService;
