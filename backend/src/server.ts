import app from './app.js';
import { config } from './config/index.js';
import { prisma } from './db.js';

async function connectDb() {
  try {
    await prisma.$connect();
  } catch (error) {
    console.error('[Null-Auth Backend] Database connection error:', error);
  }
}

connectDb();

if (!process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`==================================================`);
    console.log(`  Null-Auth REST API Server running on port ${config.port}`);
    console.log(`  Environment: ${config.env}`);
    console.log(`  Health Check: http://localhost:${config.port}/health`);
    console.log(`  API Base URL: http://localhost:${config.port}/api/v1`);
    console.log(`==================================================`);
  });
}

export default app;
