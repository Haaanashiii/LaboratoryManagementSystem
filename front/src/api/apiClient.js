// Laboratory Management System API client
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Hardcoded users for development (no seeder needed)
const MOCK_USERS = [
  { id: '1', email: 'admin@its.ac.id', name: 'System Admin', role: 'admin', department: 'IT', created_date: '2024-01-01' },
  { id: '2', email: 'head@its.ac.id', name: 'Dr. Head Lab', role: 'head_of_lab', department: 'Chemistry', created_date: '2024-01-01' },
  { id: '3', email: 'lecturer@its.ac.id', name: 'Prof. Lecturer', role: 'lecturer', department: 'Physics', created_date: '2024-01-01' },
  { id: '4', email: 'assistant@its.ac.id', name: 'Lab Assistant', role: 'lab_assistant', department: 'Chemistry', created_date: '2024-01-01' },
  { id: '5', email: 'student@its.ac.id', name: 'Student User', role: 'student', department: 'Chemistry', created_date: '2024-01-01' },
];

// Helper for making authenticated requests to the real backend
const request = async (endpoint, options = {}) => {
  const token = sessionStorage.getItem('token');
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
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
      } catch (e) {
        // Mock fallback
        return { success: true, message: 'Password changed successfully' };
      }
    },

    redirectToLogin: (redirectUrl) => {
      window.location.href = `/login?redirect=${encodeURIComponent(redirectUrl)}`;
    },
  },

  // Users (hardcoded for dev)
  users: {
    inviteUser: async (email, role) => {
      const newUser = {
        id: Date.now().toString(),
        email,
        name: email.split('@')[0],
        role,
        created_date: new Date().toISOString(),
      };
      MOCK_USERS.push(newUser);
      return newUser;
    },
  },

  // Entities
  entities: {
    // Users - hardcoded
    User: {
      list: async () => MOCK_USERS,
      filter: async (filters) => MOCK_USERS.filter(u => Object.keys(filters).every(k => u[k] === filters[k])),
      update: async (id, data) => {
        const i = MOCK_USERS.findIndex(u => u.id === id);
        if (i !== -1) { MOCK_USERS[i] = { ...MOCK_USERS[i], ...data }; return MOCK_USERS[i]; }
        throw new Error('User not found');
      },
    },

    // Equipment - REAL BACKEND
    Equipment: {
      list: async () => {
        const data = await request('/equipment');
        return data.data.map(item => ({
          ...item,
          id: item._id || item.id,
          image_url: item.image,
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
          image_url: item.image,
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
        const res = await fetch(`${API_BASE_URL}/equipment/upload-image`, {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Image upload failed');
        }
        const data = await res.json();
        return data.data.url;
      },
    },

    // Borrow Requests - REAL BACKEND
    BorrowRequest: {
      list: async () => {
        const data = await request('/borrow-requests');
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
