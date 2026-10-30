// API Client for PharmaCare Pro

const API = (() => {
  const BASE_URL = '/api';

  async function request(endpoint, options = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, config);
      const json = await response.json();

      if (!response.ok) {
        const error = new Error(json.message || 'API request failed.');
        error.status = response.status;
        error.errors = json.errors || {};
        error.data = json;
        throw error;
      }

      return json;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  }

  return {
    // Medicines API
    getMedicines: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/medicines${qs ? `?${qs}` : ''}`);
    },
    getMedicine: (id) => request(`/medicines/${id}`),
    createMedicine: (data) => request('/medicines', { method: 'POST', body: JSON.stringify(data) }),
    updateMedicine: (id, data) => request(`/medicines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteMedicine: (id) => request(`/medicines/${id}`, { method: 'DELETE' }),
    adjustStock: (id, data) => request(`/medicines/${id}/stock`, { method: 'POST', body: JSON.stringify(data) }),

    // Categories API
    getCategories: () => request('/categories'),
    createCategory: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
    updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

    // Suppliers API
    getSuppliers: () => request('/suppliers'),
    createSupplier: (data) => request('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
    updateSupplier: (id, data) => request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteSupplier: (id) => request(`/suppliers/${id}`, { method: 'DELETE' }),

    // Sales & POS API
    getSales: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/sales${qs ? `?${qs}` : ''}`);
    },
    getSale: (id) => request(`/sales/${id}`),
    createSale: (data) => request('/sales', { method: 'POST', body: JSON.stringify(data) }),

    // Dashboard Statistics API
    getDashboard: () => request('/stats/dashboard')
  };
})();
