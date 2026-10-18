/**
 * Local development entry point.
 * On Vercel, api/index.ts is used instead — it just exports the app.
 */
import path from 'path';
import dotenv from 'dotenv';

// Load .env before anything else
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import app from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received: closing server`);
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

export default app;
