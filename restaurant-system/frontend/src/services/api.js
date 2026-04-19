import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || { message: 'Network error' });
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// Orders
export const ordersAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getOne: (id) => api.get(`/orders/${id}`),
  getActive: () => api.get('/orders/active'),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  addItem: (id, data) => api.post(`/orders/${id}/items`, data),
  cancelItem: (orderId, itemId) => api.delete(`/orders/${orderId}/items/${itemId}`),
};

// Tables
export const tablesAPI = {
  getAll: (params) => api.get('/tables', { params }),
  getOne: (id) => api.get(`/tables/${id}`),
  create: (data) => api.post('/tables', data),
  update: (id, data) => api.put(`/tables/${id}`, data),
  updateStatus: (id, status) => api.patch(`/tables/${id}/status`, { status }),
  delete: (id) => api.delete(`/tables/${id}`),
  getSections: () => api.get('/tables/sections'),
  createSection: (data) => api.post('/tables/sections', data),
};

// Menu
export const menuAPI = {
  getCategories: (params) => api.get('/menu/categories', { params }),
  createCategory: (data) => api.post('/menu/categories', data),
  updateCategory: (id, data) => api.put(`/menu/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/menu/categories/${id}`),
  getItems: (params) => api.get('/menu/items', { params }),
  getItem: (id) => api.get(`/menu/items/${id}`),
  createItem: (data) => api.post('/menu/items', data),
  updateItem: (id, data) => api.put(`/menu/items/${id}`, data),
  deleteItem: (id) => api.delete(`/menu/items/${id}`),
  toggleAvailability: (id) => api.patch(`/menu/items/${id}/toggle`),
};

// Payments
export const paymentsAPI = {
  process: (data) => api.post('/payments', data),
  getAll: (params) => api.get('/payments', { params }),
  refund: (id, reason) => api.post(`/payments/${id}/refund`, { reason }),
};

// Inventory
export const inventoryAPI = {
  getItems: (params) => api.get('/inventory', { params }),
  getItem: (id) => api.get(`/inventory/${id}`),
  createItem: (data) => api.post('/inventory', data),
  updateItem: (id, data) => api.put(`/inventory/${id}`, data),
  deleteItem: (id) => api.delete(`/inventory/${id}`),
  adjustStock: (data) => api.post('/inventory/adjust', data),
  getTransactions: (params) => api.get('/inventory/transactions', { params }),
  getLowStock: () => api.get('/inventory/low-stock'),
  getCategories: () => api.get('/inventory/categories'),
  getSuppliers: () => api.get('/inventory/suppliers'),
  createSupplier: (data) => api.post('/inventory/suppliers', data),
  updateSupplier: (id, data) => api.put(`/inventory/suppliers/${id}`, data),
};

// Customers
export const customersAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getOne: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  search: (q) => api.get('/customers/search', { params: { q } }),
  adjustLoyalty: (id, data) => api.post(`/customers/${id}/loyalty`, data),
};

// Reports
export const reportsAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
  getSales: (params) => api.get('/reports/sales', { params }),
  getItems: (params) => api.get('/reports/items', { params }),
  getStaff: (params) => api.get('/reports/staff', { params }),
  getHourly: (params) => api.get('/reports/hourly', { params }),
};

// Settings
export const settingsAPI = {
  getAll: (params) => api.get('/settings', { params }),
  update: (key, value) => api.put(`/settings/${key}`, { value }),
  updateBulk: (settings) => api.put('/settings/bulk', { settings }),
};

// Reservations
export const reservationsAPI = {
  getAll: (params) => api.get('/reservations', { params }),
  create: (data) => api.post('/reservations', data),
  update: (id, data) => api.put(`/reservations/${id}`, data),
  cancel: (id) => api.delete(`/reservations/${id}`),
};

// Kitchen
export const kitchenAPI = {
  getOrders: () => api.get('/kitchen'),
  getStats: () => api.get('/kitchen/stats'),
  updateItemStatus: (itemId, status) => api.patch(`/kitchen/items/${itemId}`, { status }),
  markReady: (orderId) => api.patch(`/kitchen/${orderId}/ready`),
};

// Users
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getOne: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getRoles: () => api.get('/users/roles'),
  resetPassword: (id, data) => api.post(`/users/${id}/reset-password`, data),
};

// Dashboard
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

export default api;
