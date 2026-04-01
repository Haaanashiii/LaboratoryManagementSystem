import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const SOCKET_BASE_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL.replace(/\/api\/?$/, '');

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

  socketToken = token;
  socketInstance = io(SOCKET_BASE_URL, {
    auth: { token },
    withCredentials: true,
    transports: ['websocket', 'polling']
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
