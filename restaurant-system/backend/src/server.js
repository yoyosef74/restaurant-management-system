require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocket } = require('./socket');
const { sequelize } = require('./models');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSocket(server);

async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    await sequelize.sync({ alter: false });
    logger.info('Database models synchronized');

    server.listen(PORT, () => {
      logger.info(`Restaurant API Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`WebSocket enabled`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await sequelize.close();
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection:', err);
  process.exit(1);
});

startServer();
