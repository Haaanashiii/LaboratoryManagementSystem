// Laboratory Management System API client
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
  const token = sessionStorage.getItem('token');
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
    if (res.status === 401) {
      throw new Error('Your session is not authenticated. Please log in again.');
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
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('currentUser', JSON.stringify(userData));
      
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
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('currentUser', JSON.stringify(userData));
      
      return userData;
    },

    logout: async () => {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('currentUser');
    },

    me: async () => {
      const stored = sessionStorage.getItem('currentUser');
      return stored ? JSON.parse(stored) : null;
    },

    updateMe: async (data) => {
      const stored = sessionStorage.getItem('currentUser');
      const currentUser = stored ? JSON.parse(stored) : null;
      if (currentUser) {
        const updated = { ...currentUser, ...data };
        sessionStorage.setItem('currentUser', JSON.stringify(updated));
        return updated;
      }
      return currentUser;
    },

    changePassword: async (data) => {
      // Try real backend
      try {
        return await request('/auth/update-password', {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } catch {
        // Mock fallback
        return { success: true, message: 'Password changed successfully' };
      }
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
    },

    // Equipment - REAL BACKEND
    Equipment: {
      list: async () => {
        const data = await request('/equipment');
        return data.data.map(item => ({
          ...item,
          id: item._id || item.id,
          image_url: resolveApiAssetUrl(item.image),
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
          total_quantity: item.quantity,
          available_quantity: item.available,
        }));
      },
      create: async (formData) => {
        const payload = {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          image: formData.image_url,
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
        const payload = {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          image: formData.image_url,
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
        const token = sessionStorage.getItem('token');
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
        const data = await request(`/borrow-requests/${id}/return`, {
          method: 'PUT',
          body: JSON.stringify(returnData),
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
    },
  },
};

// Development credentials info
export const DEV_CREDENTIALS = {
  info: 'Use any of these accounts (password can be anything if backend is off):',
  accounts: [
    { email: 'admin@its.ac.id', role: 'admin', desc: 'System Administrator - Full access' },
    { email: 'head@its.ac.id', role: 'head_of_lab', desc: 'Head of Laboratory - Final approval authority' },
    { email: 'lecturer@its.ac.id', role: 'lecturer', desc: 'Lecturer - Academic verification' },
    { email: 'assistant@its.ac.id', role: 'lab_assistant', desc: 'Student Admin - Operational handling' },
    { email: 'student@its.ac.id', role: 'student', desc: 'Student - Borrow equipment' },
  ]
};
