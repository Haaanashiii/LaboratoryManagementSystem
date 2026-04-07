import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const stripApiSuffix = (value) => String(value || '').replace(/\/api\/?$/, '');
const apiOrigin = stripApiSuffix(API_BASE_URL);
const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL;
const SOCKET_BASE_URL = stripApiSuffix(configuredSocketUrl || apiOrigin);

let socketInstance = null;
let socketToken = null;

export const connectNotificationSocket = (token) => {
  if (!token) {
    return null;
  }

  if (socketInstance && socketToken === token) {
    return socketInstance;
  }

  if (socketInstance) {
    socketInstance.disconnect();
  }

  if (configuredSocketUrl && stripApiSuffix(configuredSocketUrl) !== apiOrigin) {
    console.warn(
      `[socket] VITE_SOCKET_URL (${configuredSocketUrl}) differs from API origin (${apiOrigin}). ` +
      'Ensure backend API and Socket.IO share the same host/port unless intentionally separated.'
    );
  }

  socketToken = token;
  socketInstance = io(SOCKET_BASE_URL, {
    auth: { token },
    withCredentials: true,
    transports: ['websocket', 'polling']
  });

  socketInstance.on('connect', () => {
    console.info(`[socket] connected to ${SOCKET_BASE_URL} as ${socketInstance.id}`);
  });

  socketInstance.on('connect_error', (error) => {
    console.error('[socket] connect_error:', error?.message || error);
  });

  socketInstance.on('disconnect', (reason) => {
    console.info(`[socket] disconnected: ${reason}`);
  });

  return socketInstance;
};

export const disconnectNotificationSocket = () => {
  if (!socketInstance) {
    return;
  }

  socketInstance.disconnect();
  socketInstance = null;
  socketToken = null;
};
