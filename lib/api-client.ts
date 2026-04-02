import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('auth_token');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error.response?.data);
  }
);

export const apiClient = {
  // Posts
  getPosts: (params?: any) => api.get('/posts', { params }),
  getPost: (id: string) => api.get(`/posts/${id}`),
  createPost: (data: any) => api.post('/posts', data),
  updatePost: (id: string, data: any) => api.put(`/posts/${id}`, data),
  deletePost: (id: string) => api.delete(`/posts/${id}`),

  // Comments
  getComments: (postId: string) => api.get(`/posts/${postId}/comments`),
  createComment: (postId: string, data: any) => api.post(`/posts/${postId}/comments`, data),
  deleteComment: (id: string) => api.delete(`/comments/${id}`),

  // Likes
  likePost: (postId: string) => api.post(`/posts/${postId}/like`),
  unlikePost: (postId: string) => api.delete(`/posts/${postId}/like`),
  likeComment: (commentId: string) => api.post(`/comments/${commentId}/like`),
  unlikeComment: (commentId: string) => api.delete(`/comments/${commentId}/like`),

  // Users
  getUser: (id: string) => api.get(`/users/${id}`),
  updateUser: (id: string, data: any) => api.put(`/users/${id}`, data),
  searchUsers: (query: string) => api.get('/users/search', { params: { q: query } }),

  // Follow
  followUser: (userId: string) => api.post(`/users/${userId}/follow`),
  unfollowUser: (userId: string) => api.delete(`/users/${userId}/follow`),
  getFollowers: (userId: string) => api.get(`/users/${userId}/followers`),
  getFollowing: (userId: string) => api.get(`/users/${userId}/following`),

  // Notifications
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),

  // Messages
  getConversations: () => api.get('/messages'),
  getMessages: (conversationId: string) => api.get(`/messages/${conversationId}`),
  sendMessage: (conversationId: string, data: any) => api.post(`/messages/${conversationId}`, data),

  // Search
  search: (query: string, type?: string) =>
    api.get('/search', { params: { q: query, type } }),

  // Admin
  getReports: () => api.get('/admin/reports'),
  reviewReport: (reportId: string, data: any) => api.post(`/admin/reports/${reportId}/review`, data),
  banUser: (userId: string) => api.post(`/admin/users/${userId}/ban`),
};

export default api;
