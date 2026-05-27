const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const User = require('./models/User');

let ioInstance = null;

const extractToken = (socket) => {
  const authToken = socket.handshake?.auth?.token;
  if (authToken && typeof authToken === 'string') {
    return authToken;
  }

  const authHeader = socket.handshake?.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return null;
};

const initSocket = (server, allowedOrigins) => {
  ioInstance = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    }
  });

  console.log(` Socket.IO ready on same HTTP server (origins: ${allowedOrigins.join(', ')})`);

  ioInstance.use(async (socket, next) => {
    try {
      const token = extractToken(socket);
      if (!token) {
        return next(new Error('Authentication token is required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id role status');
      if (!user || user.status !== 'active') {
        return next(new Error('User is not authorized'));
      }

      socket.user = {
        id: user._id.toString(),
        role: user.role
      };

      return next();
    } catch {
      return next(new Error('Socket authentication failed'));
    }
  });

  ioInstance.on('connection', (socket) => {
    const userIdRoom = `user:${socket.user.id}`;
    const roleRoom = `role:${socket.user.role}`;

    socket.join(userIdRoom);
    socket.join(roleRoom);

    console.log(` Socket connected: ${socket.id} | user=${socket.user.id} | role=${socket.user.role}`);

    socket.on('disconnect', (reason) => {
      console.log(` Socket disconnected: ${socket.id} | reason=${reason}`);
    });
  });

  return ioInstance;
};

const emitNotificationToUser = (userId, payload) => {
  if (!ioInstance || !userId) {
    return;
  }

  ioInstance.to(`user:${String(userId)}`).emit('notification:new', payload);
};

const emitNotificationRefreshToRole = (role, payload = {}) => {
  if (!ioInstance || !role) {
    return;
  }

  ioInstance.to(`role:${role}`).emit('notification:refresh', payload);
};

const emitNotificationRefreshToUser = (userId, payload = {}) => {
  if (!ioInstance || !userId) {
    return;
  }

  ioInstance.to(`user:${String(userId)}`).emit('notification:refresh', payload);
};

const emitEquipmentUpdate = (payload = {}) => {
  if (!ioInstance) {
    return;
  }

  ioInstance.emit('equipment:update', payload);
};

module.exports = {
  initSocket,
  emitNotificationToUser,
  emitNotificationRefreshToRole,
  emitNotificationRefreshToUser,
  emitEquipmentUpdate
};
