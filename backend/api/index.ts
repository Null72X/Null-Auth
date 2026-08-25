import app from '../src/app.js';
import { prisma } from '../src/db.js';
import bcrypt from 'bcryptjs';

let isSeeded = false;

async function ensureAdminSeeded() {
  if (isSeeded) return;
  try {
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
    isSeeded = true;
  } catch (error) {
    console.error('[Null-Auth Backend] Seeding error:', error);
  }
}

export default async function handler(req: any, res: any) {
  await ensureAdminSeeded();
  return app(req, res);
}
