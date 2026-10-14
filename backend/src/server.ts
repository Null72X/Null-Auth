import app from './app.js';
import { config } from './config/index.js';
import { prisma, ensureDbSchema } from './db.js';

async function pruneOldLogs() {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const result = await prisma.activityLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (result.count > 0) {
      console.log(`[DB Maintenance] Pruned ${result.count} activity logs older than 60 days.`);
    }
  } catch {
    // Non-blocking maintenance failure
  }
}

async function startServer() {
  try {
    await prisma.$connect();
    await ensureDbSchema();
    console.log('[Null-Auth Backend] Connected to database successfully.');

    // Run initial log cleanup and schedule daily maintenance
    pruneOldLogs().catch(() => {});
    setInterval(() => pruneOldLogs().catch(() => {}), 24 * 60 * 60 * 1000);

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

if (!process.env.VERCEL) {
  startServer();
}

export default app;
