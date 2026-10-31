import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

// Request Interceptor: Attach JWT Token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pharmacare_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response Interceptor: Parse standardized API messages
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

export const MedicineService = {
  getAll: (params) => api.get('/medicines', { params }),
  getById: (id) => api.get(`/medicines/${id}`),
  create: (data) => api.post('/medicines', data),
  update: (id, data) => api.put(`/medicines/${id}`, data),
  adjustStock: (id, data) => api.post(`/medicines/${id}/stock`, data),
  delete: (id) => api.delete(`/medicines/${id}`)
};

export const CategoryService = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`)
};

export const SupplierService = {
  getAll: () => api.get('/suppliers'),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`)
};

export const SaleService = {
  create: (data) => api.post('/sales', data),
  getAll: (params) => api.get('/sales', { params }),
  getById: (id) => api.get(`/sales/${id}`)
};

export const StatsService = {
  getDashboard: () => api.get('/stats/dashboard')
};

export default api;
