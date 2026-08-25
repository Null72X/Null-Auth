import app from './app.js';
import { config } from './config/index.js';
import { prisma } from './db.js';
import bcrypt from 'bcryptjs';

async function connectDbAndSeedAdmin() {
  try {
    await prisma.$connect();
    
    // Check if initial admin account exists in Supabase DB
    const adminCount = await prisma.admin.count();
    if (adminCount === 0) {
      const username = process.env.INITIAL_ADMIN_USERNAME || 'admin';
      const password = process.env.INITIAL_ADMIN_PASSWORD || 'NullAuthAdminPassword2026!';
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);

      await prisma.admin.create({
        data: { username, passwordHash },
      });
      console.log(`[Null-Auth Backend] Automatically created initial admin user: '${username}'`);
    }
  } catch (error) {
    console.error('[Null-Auth Backend] Database initialization error:', error);
  }
}

connectDbAndSeedAdmin();

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
