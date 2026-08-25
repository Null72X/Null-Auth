import app from './app.js';
import { config } from './config/index.js';
import { prisma } from './db.js';

async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('[Null-Auth Backend] Connected to database successfully.');

    app.listen(config.port, () => {
      console.log(`==================================================`);
      console.log(`  Null-Auth REST API Server running on port ${config.port}`);
      console.log(`  Environment: ${config.env}`);
      console.log(`  Health Check: http://localhost:${config.port}/health`);
      console.log(`  API Base URL: http://localhost:${config.port}/api/v1`);
      console.log(`==================================================`);
    });
  } catch (error) {
    console.error('[Null-Auth Backend] Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
