// Laboratory Management System API client
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Mock data for development - Initialize with sample users
const mockUsers = [
  { id: '1', email: 'admin@its.ac.id', name: 'System Admin', role: 'admin', created_date: '2024-01-01' },
  { id: '2', email: 'head@its.ac.id', name: 'Dr. Head Lab', role: 'head_of_lab', created_date: '2024-01-01' },
  { id: '3', email: 'lecturer@its.ac.id', name: 'Prof. Lecturer', role: 'lecturer', created_date: '2024-01-01' },
  { id: '4', email: 'assistant@its.ac.id', name: 'Lab Assistant', role: 'lab_assistant', created_date: '2024-01-01' },
  { id: '5', email: 'student@its.ac.id', name: 'Student User', role: 'student', created_date: '2024-01-01' },
];

// Sample equipment
const mockEquipment = [
  { id: '1', name: 'Microscope', category: 'Optical', quantity: 5, available: 5, condition: 'Good', location: 'Room 101' },
  { id: '2', name: 'Beaker Set', category: 'Glassware', quantity: 20, available: 18, condition: 'Good', location: 'Storage A' },
  { id: '3', name: 'pH Meter', category: 'Measurement', quantity: 3, available: 2, condition: 'Good', location: 'Room 102' },
];

const mockBorrowRequests = [];

// Authentication store (mock)
let currentUser = null;

export const api = {
  // Authentication
  auth: {
    login: async (email) => {
      // Detect role from email or find in mock users
      const foundUser = mockUsers.find(u => u.email === email);
      
      if (foundUser) {
        currentUser = foundUser;
      } else {
        // Default to student for unknown emails
        currentUser = {
          id: Date.now().toString(),
          email: email || 'student@its.ac.id',
          name: email.split('@')[0] || 'Test User',
          role: 'student',
        };
      }
      
      // Store in sessionStorage for persistence
      sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
      return currentUser;
    },
    
    logout: async () => {
      currentUser = null;
      sessionStorage.removeItem('currentUser');
    },
    
    me: async () => {
      // Check sessionStorage first
      if (!currentUser) {
        const stored = sessionStorage.getItem('currentUser');
        if (stored) {
          currentUser = JSON.parse(stored);
        }
      }
      
      // Return mock current user
      return currentUser || {
        id: '1',
        email: 'student@its.ac.id',
        name: 'Test User',
        role: 'student',
      };
    },
    
    updateMe: async (data) => {
      // Update current user data
      if (currentUser) {
        currentUser = { ...currentUser, ...data };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Also update in mockUsers array
        const userIndex = mockUsers.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
          mockUsers[userIndex] = { ...mockUsers[userIndex], ...data };
        }
      }
      return currentUser;
    },
    
    changePassword: async (data) => {
      // Mock password change - in real app, this would call backend
      // For now, just simulate a successful change
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!data.currentPassword) {
        throw new Error('Current password is required');
      }
      
      if (!data.newPassword) {
        throw new Error('New password is required');
      }
      
      // Simulate success
      return { success: true, message: 'Password changed successfully' };
    },
    
    redirectToLogin: (redirectUrl) => {
      window.location.href = `/login?redirect=${encodeURIComponent(redirectUrl)}`;
    },
  },

  // Users
  users: {
    inviteUser: async (email, role) => {
      const newUser = {
        id: Date.now().toString(),
        email,
        role,
        created_date: new Date().toISOString(),
      };
      mockUsers.push(newUser);
      return newUser;
    },
  },

  // Entities
  entities: {
    User: {
      list: async () => {
        return mockUsers;
      },
      filter: async (filters) => {
        return mockUsers.filter(user => {
          return Object.keys(filters).every(key => user[key] === filters[key]);
        });
      },
      update: async (id, data) => {
        const index = mockUsers.findIndex(u => u.id === id);
        if (index !== -1) {
          mockUsers[index] = { ...mockUsers[index], ...data };
          return mockUsers[index];
        }
        throw new Error('User not found');
      },
    },

    Equipment: {
      list: async () => {
        return mockEquipment;
      },
      filter: async (filters) => {
        return mockEquipment.filter(item => {
          return Object.keys(filters).every(key => item[key] === filters[key]);
        });
      },
      create: async (data) => {
        const newItem = {
          id: Date.now().toString(),
          ...data,
          created_date: new Date().toISOString(),
        };
        mockEquipment.push(newItem);
        return newItem;
      },
      update: async (id, data) => {
        const index = mockEquipment.findIndex(e => e.id === id);
        if (index !== -1) {
          mockEquipment[index] = { ...mockEquipment[index], ...data };
          return mockEquipment[index];
        }
        throw new Error('Equipment not found');
      },
      delete: async (id) => {
        const index = mockEquipment.findIndex(e => e.id === id);
        if (index !== -1) {
          mockEquipment.splice(index, 1);
          return { success: true };
        }
        throw new Error('Equipment not found');
      },
    },

    BorrowRequest: {
      list: async (orderBy = '-created_date') => {
        return [...mockBorrowRequests].sort((a, b) => {
          if (orderBy.startsWith('-')) {
            return new Date(b.created_date) - new Date(a.created_date);
          }
          return new Date(a.created_date) - new Date(b.created_date);
        });
      },
      filter: async (filters, orderBy) => {
        let filtered = mockBorrowRequests.filter(request => {
          return Object.keys(filters).every(key => request[key] === filters[key]);
        });
        
        if (orderBy) {
          filtered = filtered.sort((a, b) => {
            if (orderBy.startsWith('-')) {
              return new Date(b.created_date) - new Date(a.created_date);
            }
            return new Date(a.created_date) - new Date(b.created_date);
          });
        }
        
        return filtered;
      },
      create: async (data) => {
        const newRequest = {
          id: Date.now().toString(),
          ...data,
          status: 'pending_lecturer',
          created_date: new Date().toISOString(),
        };
        mockBorrowRequests.push(newRequest);
        return newRequest;
      },
      update: async (id, data) => {
        const index = mockBorrowRequests.findIndex(r => r.id === id);
        if (index !== -1) {
          mockBorrowRequests[index] = { ...mockBorrowRequests[index], ...data };
          return mockBorrowRequests[index];
        }
        throw new Error('Request not found');
      },
    },
  },
};

// Development credentials info
export const DEV_CREDENTIALS = {
  info: 'In development mode, any email/password combination will work. Use these test accounts:',
  accounts: [
    { email: 'admin@its.ac.id', role: 'admin', desc: 'System Administrator - Full access' },
    { email: 'head@its.ac.id', role: 'head_of_lab', desc: 'Head of Laboratory - Final approval authority' },
    { email: 'lecturer@its.ac.id', role: 'lecturer', desc: 'Lecturer - Academic verification' },
    { email: 'assistant@its.ac.id', role: 'lab_assistant', desc: 'Student Admin - Operational handling' },
    { email: 'student@its.ac.id', role: 'student', desc: 'Student - Borrow equipment' },
  ]
};
