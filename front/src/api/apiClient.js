// Laboratory Management System API client
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const TOKEN_KEY = 'token';
const USER_KEY = 'currentUser';
const AUTH_STORAGE_MODE_KEY = 'authStorageMode';
const STORAGE_MODES = {
  LOCAL: 'local',
  SESSION: 'session',
};

const getStorageByMode = (mode) => (mode === STORAGE_MODES.SESSION ? sessionStorage : localStorage);

const getActiveAuthStorage = () => {
  const preferredMode = localStorage.getItem(AUTH_STORAGE_MODE_KEY);

  if (preferredMode === STORAGE_MODES.SESSION) {
    return sessionStorage;
  }

  if (preferredMode === STORAGE_MODES.LOCAL) {
    return localStorage;
  }

  if (localStorage.getItem(TOKEN_KEY) || localStorage.getItem(USER_KEY)) {
    return localStorage;
  }

  if (sessionStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(USER_KEY)) {
    return sessionStorage;
  }

  return localStorage;
};

const storeAuthData = ({ token, userData, rememberMe = true }) => {
  const targetMode = rememberMe ? STORAGE_MODES.LOCAL : STORAGE_MODES.SESSION;
  const targetStorage = getStorageByMode(targetMode);
  const otherStorage = targetStorage === localStorage ? sessionStorage : localStorage;

  otherStorage.removeItem(TOKEN_KEY);
  otherStorage.removeItem(USER_KEY);

  targetStorage.setItem(TOKEN_KEY, token);
  targetStorage.setItem(USER_KEY, JSON.stringify(userData));

  localStorage.setItem(AUTH_STORAGE_MODE_KEY, targetMode);
};

const clearAuthStorage = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(AUTH_STORAGE_MODE_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
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

export const getStoredToken = () => {
  const storage = getActiveAuthStorage();
  return storage.getItem(TOKEN_KEY);
};

export const getStoredUser = () => {
  const storage = getActiveAuthStorage();
  return storage.getItem(USER_KEY);
};

export const setRememberSession = (rememberMe) => {
  localStorage.setItem(
    AUTH_STORAGE_MODE_KEY,
    rememberMe ? STORAGE_MODES.LOCAL : STORAGE_MODES.SESSION
  );
};

export const isTokenExpired = (token) => {
  if (!token) return true;

  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;

  return payload.exp * 1000 <= Date.now();
};

export const clearStoredAuth = clearAuthStorage;

const resolveApiAssetUrl = (value) => {
  if (!value) return value;

  const normalizedValue = String(value).trim().replace(/\\/g, '/');
  if (!normalizedValue) return normalizedValue;
  if (/^https?:\/\//i.test(normalizedValue)) return normalizedValue;

  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
  if (normalizedValue.startsWith('/')) {
    return `${apiOrigin}${normalizedValue}`;
  }

  return `${apiOrigin}/${normalizedValue}`;
};

const normalizeEquipmentImages = (item = {}) => {
  const rawImages = [];

  if (Array.isArray(item.images)) {
    rawImages.push(...item.images);
  }
  if (Array.isArray(item.images_urls)) {
    rawImages.push(...item.images_urls);
  }

  // Support legacy/single-image fields used by older records.
  rawImages.push(item.image, item.image_url);

  const normalized = rawImages
    .map((img) => {
      if (!img) return null;
      if (typeof img === 'string') return resolveApiAssetUrl(img);

      // Some payloads may store image objects like { url } or { path }.
      if (typeof img === 'object') {
        return resolveApiAssetUrl(img.url || img.path || img.src || '');
      }

      return null;
    })
    .filter(Boolean);

  const uniqueImages = [...new Set(normalized)];
  return {
    image_url: uniqueImages[0] || '',
    images_urls: uniqueImages,
  };
};

// Helper for making authenticated requests to the real backend
const request = async (endpoint, options = {}) => {
  const token = getStoredToken();

  const getRetryAfterMs = (response) => {
    const retryAfterHeader = response.headers.get('retry-after');
    if (retryAfterHeader) {
      const asSeconds = Number(retryAfterHeader);
      if (Number.isFinite(asSeconds) && asSeconds > 0) {
        return asSeconds * 1000;
      }

      const asDate = Date.parse(retryAfterHeader);
      if (Number.isFinite(asDate)) {
        const diff = asDate - Date.now();
        if (diff > 0) return diff;
      }
    }

    const rateLimitResetHeader = response.headers.get('ratelimit-reset');
    if (rateLimitResetHeader) {
      const asSeconds = Number(rateLimitResetHeader);
      if (Number.isFinite(asSeconds) && asSeconds > 0) {
        return asSeconds * 1000;
      }
    }

    return null;
  };

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
      throw new Error(data.message || 'You do not have permission to access this resource with the current account.');
    }
    const error = new Error(data.message || `Request failed with status ${res.status}`);
    error.status = res.status;
    const retryAfterMs = getRetryAfterMs(res);
    if (retryAfterMs) {
      error.retryAfterMs = retryAfterMs;
    }
    throw error;
  }

  return data;
};

export const api = {
  // Authentication (real backend)
  auth: {
    login: async (email, password, options = {}) => {
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
      storeAuthData({
        token,
        userData,
        rememberMe: options.rememberMe !== false,
      });
      
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
      storeAuthData({ token, userData, rememberMe: true });

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
      storeAuthData({ token, userData, rememberMe: true });
      
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

      const storage = getActiveAuthStorage();
      storage.setItem(USER_KEY, JSON.stringify(data.data));
      return data.data;
    },

    updateMe: async (data) => {
      const storage = getActiveAuthStorage();
      const stored = storage.getItem(USER_KEY);
      const currentUser = stored ? JSON.parse(stored) : null;
      if (currentUser) {
        const updated = { ...currentUser, ...data };
        storage.setItem(USER_KEY, JSON.stringify(updated));
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

    verifyPassword: async (currentPassword) => {
      return await request('/auth/verify-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword }),
      });
    },

    updateName: async (name) => {
      const data = await request('/auth/update-name', {
        method: 'PUT',
        body: JSON.stringify({ name }),
      });
      // Keep local cache in sync
      const storage = getActiveAuthStorage();
      const stored = storage.getItem(USER_KEY);
      if (stored) {
        const current = JSON.parse(stored);
        storage.setItem(USER_KEY, JSON.stringify({ ...current, name: data.data?.name ?? name }));
      }
      return data;
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
    },
    markAsUnread: async (id) => {
      const data = await request(`/notifications/${id}/unread`, {
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
      byRole: async (role) => {
        const data = await request(`/users/role/${role}`);
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
      getById: async (id) => {
        const data = await request(`/equipment/${id}`);
        const item = data.data;
        const normalizedImages = normalizeEquipmentImages(item);
        return {
          ...item,
          ...normalizedImages,
          id: item._id || item.id,
          total_quantity: item.quantity,
          available_quantity: item.available,
        };
      },
      list: async () => {
        const data = await request('/equipment');
        return data.data.map(item => {
          const normalizedImages = normalizeEquipmentImages(item);
          return {
            ...item,
            ...normalizedImages,
            id: item._id || item.id,
            total_quantity: item.quantity,
            available_quantity: item.available,
          };
        });
      },
      filter: async (filters) => {
        const params = new URLSearchParams(filters).toString();
        const data = await request(`/equipment?${params}`);
        return data.data.map(item => {
          const normalizedImages = normalizeEquipmentImages(item);
          return {
            ...item,
            ...normalizedImages,
            id: item._id || item.id,
            total_quantity: item.quantity,
            available_quantity: item.available,
          };
        });
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
        return resolveApiAssetUrl(data.data.url || data.data.path || data.data.filename);
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
        return data.data.map(item => {
          const eqImages = item.equipment ? normalizeEquipmentImages(item.equipment) : { image_url: '', images_urls: [] };
          return { ...item, id: item._id || item.id, equipment_image_url: eqImages.image_url, equipment_images_urls: eqImages.images_urls };
        });
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
      getById: async (id) => {
        const data = await request(`/borrow-requests/${id}`);
        return { ...data.data, id: data.data._id || data.data.id };
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
      // ── New simplified approval flow ──────────────────────────────────
      approve: async (id) => {
        const data = await request(`/borrow-requests/${id}/approve`, { method: 'PUT' });
        return data.data;
      },
      reject: async (id, reason = '') => {
        const data = await request(`/borrow-requests/${id}/reject`, {
          method: 'PUT',
          body: JSON.stringify({ reason }),
        });
        return data.data;
      },
      downloadPdf: async (id) => {
        const token = getStoredToken();
        if (!token || isTokenExpired(token)) {
          clearAuthStorage();
          throw new Error('Your session has expired. Please log in again.');
        }
        let res;
        try {
          res = await fetch(`${API_BASE_URL}/borrow-requests/${id}/pdf`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          throw new Error('Cannot connect to backend API.');
        }
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.message || `Request failed with status ${res.status}`);
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `borrow-request-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      getPdfBlob: async (id, inline = false) => {
        const token = getStoredToken();
        if (!token || isTokenExpired(token)) {
          clearAuthStorage();
          throw new Error('Your session has expired. Please log in again.');
        }
        const suffix = inline ? '?inline=true' : '';
        let res;
        try {
          res = await fetch(`${API_BASE_URL}/borrow-requests/${id}/pdf${suffix}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          throw new Error('Cannot connect to backend API.');
        }
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.message || `Request failed with status ${res.status}`);
        }
        return res.blob();
      },
      previewPdf: async (formData, user) => {
        const token = getStoredToken();
        if (!token || isTokenExpired(token)) {
          clearAuthStorage();
          throw new Error('Your session has expired. Please log in again.');
        }
        const body = {
          borrower_name: user?.name || '',
          student_id: user?.studentId || '',
          student_email: user?.email || '',
          equipment_name: formData?.equipment_name || '',
          serial_number: formData?.serial_number || '',
          quantity: formData?.quantity || 1,
          borrow_date: formData?.borrow_date || '',
          return_date: formData?.return_date || '',
          purpose: formData?.purpose || formData?.objective || '',
          objective: formData?.objective || formData?.purpose || '',
        };
        let res;
        try {
          res = await fetch(`${API_BASE_URL}/borrow-requests/preview-pdf`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          });
        } catch {
          throw new Error('Cannot connect to backend API.');
        }
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.message || `Request failed with status ${res.status}`);
        }
        return res.blob();
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
      exportPdf: async (filters = {}) => {
        const token = getStoredToken();
        const params = new URLSearchParams(filters).toString();
        const candidateEndpoints = [
          `${API_BASE_URL}/audit-logs/export/pdf${params ? `?${params}` : ''}`,
          `${API_BASE_URL}/admin/audit-logs/export/pdf${params ? `?${params}` : ''}`,
        ];

        let lastResponse = null;

        for (const endpoint of candidateEndpoints) {
          let response;
          try {
            response = await fetch(endpoint, {
              method: 'GET',
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            });
          } catch {
            throw new Error('Cannot connect to backend API. Make sure backend is running and reachable at http://localhost:3000.');
          }

          if (response.ok) {
            return response.blob();
          }

          lastResponse = response;
          if (response.status !== 404) {
            break;
          }
        }

        const payload = await lastResponse?.json().catch(() => ({}));
        throw new Error(payload?.message || `Request failed with status ${lastResponse?.status || 500}`);
      },
    },
    Reports: {
      borrowing: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const data = await request(`/reports/borrowing${params ? `?${params}` : ''}`);

        return {
          summary: data.summary || { totalBorrowed: 0, good: 0, damaged: 0, lost: 0 },
          records: Array.isArray(data.records) ? data.records : []
        };
      },
      lecturerReleases: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const data = await request(`/reports/lecturer-releases${params ? `?${params}` : ''}`);

        return {
          summary:        data.summary        || { totalReleases: 0, totalQuantity: 0, totalLecturers: 0 },
          lecturerGroups: Array.isArray(data.lecturerGroups) ? data.lecturerGroups : [],
          weeklySummary:  Array.isArray(data.weeklySummary)  ? data.weeklySummary  : [],
          records:        Array.isArray(data.records)        ? data.records        : [],
        };
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

