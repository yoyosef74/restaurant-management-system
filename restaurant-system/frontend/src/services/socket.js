import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });
  socket.on('connect', () => console.log('Socket connected:', socket.id));
  socket.on('disconnect', (reason) => console.log('Socket disconnected:', reason));
  socket.on('connect_error', (err) => console.error('Socket error:', err.message));
  return socket;
};

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
};

export const getSocket = () => socket;

export const subscribeToEvent = (event, callback) => {
  if (socket) socket.on(event, callback);
};

export const unsubscribeFromEvent = (event, callback) => {
  if (socket) socket.off(event, callback);
};

export const emitEvent = (event, data) => {
  if (socket?.connected) socket.emit(event, data);
};
