const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const tableRoutes = require('./routes/tables');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const inventoryRoutes = require('./routes/inventory');
const customerRoutes = require('./routes/customers');
const reportRoutes = require('./routes/reports');
const settingRoutes = require('./routes/settings');
const reservationRoutes = require('./routes/reservations');
const kitchenRoutes = require('./routes/kitchen');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// Security
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: { success: false, message: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

// Body parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) }
}));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Restaurant API',
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
