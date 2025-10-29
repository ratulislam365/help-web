import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';

const userSocketMap = new Map();
let io;

export const authenticateSocket = (socket, next) => {
  const token = socket.handshake.headers.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      return next();
    } catch (error) {
      return next(new Error('Authentication failed: Invalid token.'));
    }
  }
  return next(new Error('Authentication failed: No token provided.'));
};

export const initSocket = (server) => {
  io = new SocketIOServer(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const userId = socket.userId;
    if (userId) {
      console.log(`⚡ Socket connected: ${socket.id} for user ${userId}`);
      userSocketMap.set(userId, socket.id);
    }

    socket.on('disconnect', () => {
      const userId = socket.userId;
      if (userId) {
        console.log(`❌ Socket disconnected: ${socket.id}`);
        userSocketMap.delete(userId);
      }
    });
  });

  return io;
};

// helper functions
export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};

export const emitToUser = (userId, event, data) => {
  const socketId = userSocketMap.get(userId.toString());
  if (socketId) {
    getIO().to(socketId).emit(event, data);
    return true;
  }
  return false;
};