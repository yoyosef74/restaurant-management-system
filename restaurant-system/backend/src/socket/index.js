const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
  });

  // Auth middleware for socket
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (User: ${socket.userId})`);

    // Join role-based rooms
    socket.join(`user:${socket.userId}`);
    if (socket.userRole) socket.join(`role:${socket.userRole}`);

    // Kitchen staff joins kitchen room
    if (socket.userRole === 'kitchen') socket.join('kitchen');

    // Waiter joins waiter room
    if (['waiter', 'manager', 'admin'].includes(socket.userRole)) socket.join('waiters');

    socket.on('join:table', (tableId) => {
      socket.join(`table:${tableId}`);
      logger.debug(`Socket ${socket.id} joined table:${tableId}`);
    });

    socket.on('leave:table', (tableId) => {
      socket.leave(`table:${tableId}`);
    });

    socket.on('kitchen:item_ready', (data) => {
      io.to('waiters').emit('order:item_ready', data);
      io.to(`table:${data.tableId}`).emit('order:item_ready', data);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

// Emit helpers
const emitOrderUpdate = (order) => {
  if (!io) return;
  io.to('kitchen').emit('order:updated', order);
  io.to('waiters').emit('order:updated', order);
  if (order.table_id) io.to(`table:${order.table_id}`).emit('order:updated', order);
};

const emitNewOrder = (order) => {
  if (!io) return;
  io.to('kitchen').emit('order:new', order);
  io.to('waiters').emit('order:new', order);
};

const emitTableUpdate = (table) => {
  if (!io) return;
  io.emit('table:updated', table);
};

const emitKitchenUpdate = (orderItem) => {
  if (!io) return;
  io.to('kitchen').emit('kitchen:item_updated', orderItem);
  io.to('waiters').emit('kitchen:item_updated', orderItem);
};

const emitInventoryAlert = (item) => {
  if (!io) return;
  io.to('role:admin').emit('inventory:low_stock', item);
  io.to('role:manager').emit('inventory:low_stock', item);
};

module.exports = { initSocket, getIO, emitOrderUpdate, emitNewOrder, emitTableUpdate, emitKitchenUpdate, emitInventoryAlert };
