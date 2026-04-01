// Laboratory Management System API client
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const TOKEN_KEY = 'token';
const USER_KEY = 'currentUser';

const clearAuthStorage = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

const decodeJwtPayload = (token) => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);

export const isTokenExpired = (token) => {
  if (!token) return true;

  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;

  return payload.exp * 1000 <= Date.now();
};

export const clearStoredAuth = clearAuthStorage;

const resolveApiAssetUrl = (value) => {
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;

  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
  if (value.startsWith('/')) {
    return `${apiOrigin}${value}`;
  }

  return `${apiOrigin}/${value}`;
};

// Helper for making authenticated requests to the real backend
const request = async (endpoint, options = {}) => {
  const token = getStoredToken();

  // Prevent requests with expired tokens and force re-login.
  if (token && isTokenExpired(token)) {
    clearAuthStorage();
    throw new Error('Your session has expired. Please log in again.');
  }

  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error('Cannot connect to backend API. Make sure backend is running and reachable at http://localhost:3000.');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 503) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app:maintenance-mode', {
          detail: data
        }));
      }

      const error = new Error(data.message || 'System is under maintenance.');
      error.status = 503;
      error.payload = data;
      throw error;
    }

    if (res.status === 401) {
      clearAuthStorage();
      if ((data.message || '').toLowerCase().includes('expired')) {
        throw new Error('Your session has expired. Please log in again.');
      }
      throw new Error(data.message || 'Your session is not authenticated. Please log in again.');
    }

    if (res.status === 403) {
      throw new Error('You do not have permission to access this resource with the current account.');
    }

    throw new Error(data.message || `Request failed with status ${res.status}`);
  }

  return data;
};

export const api = {
  // Authentication (real backend)
  auth: {
    login: async (email, password) => {
      // Perform real login with backend authentication
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (!data.success || !data.data) {
        throw new Error(data.message || 'Login failed');
      }

      // Store token and user data
      const { token, ...userData } = data.data;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      
      return userData;
    },

    adminLogin: async (email, password) => {
      const data = await request('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (!data.success || !data.data) {
        throw new Error(data.message || 'Admin login failed');
      }

      const { token, ...userData } = data.data;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));

      return userData;
    },

    register: async ({ name, email, password }) => {
      // Perform real registration with backend
      const data = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });

      if (!data.success || !data.data) {
        throw new Error(data.message || 'Registration failed');
      }

      // Store token and user data
      const { token, ...userData } = data.data;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      
      return userData;
    },

    logout: async () => {
      try {
        await request('/auth/logout', {
          method: 'POST',
        });
      } catch {
        // Always clear client auth state, even if backend logout fails.
      }
      clearAuthStorage();
    },

    me: async () => {
      const token = getStoredToken();
      if (!token || isTokenExpired(token)) {
        clearAuthStorage();
        return null;
      }

      const data = await request('/auth/me');
      if (!data.success || !data.data) {
        clearAuthStorage();
        return null;
      }

      localStorage.setItem(USER_KEY, JSON.stringify(data.data));
      return data.data;
    },

    updateMe: async (data) => {
      const stored = localStorage.getItem(USER_KEY);
      const currentUser = stored ? JSON.parse(stored) : null;
      if (currentUser) {
        const updated = { ...currentUser, ...data };
        localStorage.setItem(USER_KEY, JSON.stringify(updated));
        return updated;
      }
      return currentUser;
    },

    changePassword: async (data) => {
      return await request('/auth/update-password', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    redirectToLogin: (redirectUrl) => {
      window.location.href = `/login?redirect=${encodeURIComponent(redirectUrl)}`;
    },
  },

  // Users
  users: {
    inviteUser: async (email, role) => {
      const data = await request('/users', {
        method: 'POST',
        body: JSON.stringify({
          email,
          role,
          name: email.split('@')[0]
        }),
      });

      const user = data.data;
      return {
        ...user,
        id: user._id || user.id,
        created_date: user.createdAt || user.created_date
      };
    },
    addUser: async ({ name, email, password, role, department, phone }) => {
      const data = await request('/users', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          department,
          phone
        }),
      });

      const user = data.data;
      return {
        ...user,
        id: user._id || user.id,
        created_date: user.createdAt || user.created_date
      };
    },
  },

  notifications: {
    list: async () => {
      const data = await request('/notifications');
      return (data.data || []).map((item) => ({
        ...item,
        id: item._id || item.id,
        isRead: Boolean(item.isRead)
      }));
    },
    markAsRead: async (id) => {
      const data = await request(`/notifications/${id}/read`, {
        method: 'PUT'
      });

      return {
        ...data.data,
        id: data.data?._id || data.data?.id,
        isRead: Boolean(data.data?.isRead)
      };
    }
  },

  // Entities
  entities: {
    // Users - REAL BACKEND
    User: {
      list: async () => {
        const data = await request('/users');
        return data.data.map(user => ({
          ...user,
          id: user._id || user.id,
          created_date: user.createdAt || user.created_date
        }));
      },
      filter: async (filters) => {
        const params = new URLSearchParams(filters).toString();
        const data = await request(`/users?${params}`);
        return data.data.map(user => ({
          ...user,
          id: user._id || user.id,
          created_date: user.createdAt || user.created_date
        }));
      },
      update: async (id, data) => {
        const response = await request(`/users/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });

        const user = response.data;
        return {
          ...user,
          id: user._id || user.id,
          created_date: user.createdAt || user.created_date
        };
      },
      delete: async (id) => {
        return await request(`/users/${id}`, {
          method: 'DELETE',
        });
      },
    },

    // Equipment - REAL BACKEND
    Equipment: {
      list: async () => {
        const data = await request('/equipment');
        return data.data.map(item => ({
          ...item,
          id: item._id || item.id,
          image_url: resolveApiAssetUrl(item.image),
          images_urls: item.images ? item.images.map(img => resolveApiAssetUrl(img)) : [],
          total_quantity: item.quantity,
          available_quantity: item.available,
        }));
      },
      filter: async (filters) => {
        const params = new URLSearchParams(filters).toString();
        const data = await request(`/equipment?${params}`);
        return data.data.map(item => ({
          ...item,
          id: item._id || item.id,
          image_url: resolveApiAssetUrl(item.image),
          images_urls: item.images ? item.images.map(img => resolveApiAssetUrl(img)) : [],
          total_quantity: item.quantity,
          available_quantity: item.available,
        }));
      },
      create: async (formData) => {
        const images = formData.images_urls ? formData.images_urls.filter(Boolean) : [];
        const payload = {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          image: images.length > 0 ? images[0] : (formData.image_url || ''),
          images: images,
          quantity: formData.total_quantity,
          available: formData.available_quantity,
          location: formData.location,
          condition: formData.condition,
          status: formData.is_active !== false ? 'active' : 'retired',
        };
        const data = await request('/equipment', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return data.data;
      },
      update: async (id, formData) => {
        const images = formData.images_urls ? formData.images_urls.filter(Boolean) : [];
        const payload = {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          image: images.length > 0 ? images[0] : (formData.image_url || ''),
          images: images,
          quantity: formData.total_quantity,
          available: formData.available_quantity,
          location: formData.location,
          condition: formData.condition,
          status: formData.is_active !== false ? 'active' : 'retired',
        };
        const data = await request(`/equipment/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        return data.data;
      },
      delete: async (id) => {
        return await request(`/equipment/${id}`, { method: 'DELETE' });
      },
      uploadImage: async (file) => {
        const formData = new FormData();
        formData.append('image', file);
        const token = getStoredToken();
        if (!token || isTokenExpired(token)) {
          clearAuthStorage();
          throw new Error('Your session has expired. Please log in again.');
        }
        let res;
        try {
          res = await fetch(`${API_BASE_URL}/equipment/upload-image`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData,
          });
        } catch {
          throw new Error('Cannot connect to backend API. Make sure backend server is running on http://localhost:3000.');
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Image upload failed');
        }
        const data = await res.json();
        return resolveApiAssetUrl(data.data.path || data.data.filename);
      },
    },

    // Borrow Requests - REAL BACKEND
    BorrowRequest: {
      list: async () => {
        const data = await request('/borrow-requests');
        return data.data.map(item => ({ ...item, id: item._id || item.id }));
      },
      myRequests: async () => {
        const data = await request('/borrow-requests/my-requests');
        return data.data.map(item => ({ ...item, id: item._id || item.id }));
      },
      filter: async (filters) => {
        const params = new URLSearchParams(filters).toString();
        const data = await request(`/borrow-requests?${params}`);
        return data.data.map(item => ({ ...item, id: item._id || item.id }));
      },
      create: async (requestData) => {
        const data = await request('/borrow-requests', {
          method: 'POST',
          body: JSON.stringify(requestData),
        });
        return data.data;
      },
      update: async (id, updateData) => {
        const data = await request(`/borrow-requests/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updateData),
        });
        return data.data;
      },
      lecturerAction: async (id, action, remarks) => {
        const data = await request(`/borrow-requests/${id}/lecturer-action`, {
          method: 'PUT',
          body: JSON.stringify({ action, remarks }),
        });
        return data.data;
      },
      headAction: async (id, action, remarks) => {
        const data = await request(`/borrow-requests/${id}/head-action`, {
          method: 'PUT',
          body: JSON.stringify({ action, remarks }),
        });
        return data.data;
      },
      prepare: async (id) => {
        const data = await request(`/borrow-requests/${id}/prepare`, {
          method: 'PUT',
        });
        return data.data;
      },
      release: async (id) => {
        const data = await request(`/borrow-requests/${id}/release`, {
          method: 'PUT',
        });
        return data.data;
      },
      return: async (id, returnData) => {
        // Use multipart form only when damage image is provided.
        if (returnData?.damage_image instanceof File) {
          const formData = new FormData();
          Object.entries(returnData).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              formData.append(key, value);
            }
          });

          const token = getStoredToken();
          if (!token || isTokenExpired(token)) {
            clearAuthStorage();
            throw new Error('Your session has expired. Please log in again.');
          }

          let res;
          try {
            res = await fetch(`${API_BASE_URL}/borrow-requests/${id}/return`, {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            });
          } catch {
            throw new Error('Cannot connect to backend API. Make sure backend is running and reachable at http://localhost:3000.');
          }

          const payload = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(payload.message || `Request failed with status ${res.status}`);
          }

          return payload.data;
        }

        const data = await request(`/borrow-requests/${id}/return`, {
          method: 'PUT',
          body: JSON.stringify(returnData),
        });
        return data.data;
      },
      verifyDamage: async (id, action, remarks = '') => {
        const data = await request(`/borrow-requests/${id}/damage-verify`, {
          method: 'PUT',
          body: JSON.stringify({ action, remarks }),
        });
        return data.data;
      },
      delete: async (id) => {
        return await request(`/borrow-requests/${id}`, { method: 'DELETE' });
      },
    },

    // Stats
    Stats: {
      dashboard: async () => {
        const data = await request('/stats/dashboard');
        return data.data;
      },
      trends: async (period = '30') => {
        const data = await request(`/stats/trends?period=${period}`);
        return data.data;
      },
      adminMostBorrowed: async (limit = 10) => {
        const data = await request(`/stats/admin/most-borrowed?limit=${limit}`);
        return data.data;
      },
      adminLateReturnUsers: async (limit = 10) => {
        const data = await request(`/stats/admin/late-return-users?limit=${limit}`);
        return data.data;
      },
      adminBorrowingTrends: async ({ groupBy = 'day', period = 90 } = {}) => {
        const data = await request(`/stats/admin/borrowing-trends?groupBy=${groupBy}&period=${period}`);
        return data.data;
      },
    },
    AuditLogs: {
      list: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const data = await request(`/admin/audit-logs${params ? `?${params}` : ''}`);
        return data;
      },
    },
    AdminMaintenance: {
      status: async () => {
        const data = await request('/admin/maintenance-status');
        return data.data;
      },
      toggle: async (enabled) => {
        const body = typeof enabled === 'boolean' ? { enabled } : {};
        const data = await request('/admin/toggle-maintenance', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        return data.data;
      },
    },
  },
};

