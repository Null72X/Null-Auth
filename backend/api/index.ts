import app from '../src/app.js';
import { prisma } from '../src/db.js';
import bcrypt from 'bcryptjs';

let isSeeded = false;

async function ensureTablesAndAdmin() {
  if (isSeeded) return;
  try {
    // 1. Auto-create tables in Supabase Postgres if they do not exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Admin" (
        "id" TEXT PRIMARY KEY,
        "username" TEXT UNIQUE NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "lastLogin" TIMESTAMP WITH TIME ZONE
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Application" (
        "id" TEXT PRIMARY KEY,
        "appId" TEXT UNIQUE NOT NULL,
        "name" TEXT NOT NULL,
        "secret" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "status" TEXT DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "License" (
        "id" TEXT PRIMARY KEY,
        "key" TEXT UNIQUE NOT NULL,
        "appId" TEXT NOT NULL REFERENCES "Application"("id") ON DELETE CASCADE,
        "status" TEXT DEFAULT 'ACTIVE',
        "boundHwid" TEXT,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "notes" TEXT,
        "firstActivatedAt" TIMESTAMP WITH TIME ZONE,
        "lastLoginAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "HwidAccess" (
        "id" TEXT PRIMARY KEY,
        "hwidHash" TEXT NOT NULL,
        "appId" TEXT NOT NULL REFERENCES "Application"("id") ON DELETE CASCADE,
        "status" TEXT DEFAULT 'ACTIVE',
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "notes" TEXT,
        "lastAuthAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "HwidAccess_appId_hwidHash_key" UNIQUE ("appId", "hwidHash")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ActivityLog" (
        "id" TEXT PRIMARY KEY,
        "appId" TEXT,
        "action" TEXT NOT NULL,
        "actorType" TEXT NOT NULL,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "details" TEXT,
        "status" TEXT NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Check & seed default admin user
    const adminCount = await prisma.admin.count();
    if (adminCount === 0) {
      const username = process.env.INITIAL_ADMIN_USERNAME || 'admin';
      const password = process.env.INITIAL_ADMIN_PASSWORD || 'NullAuthAdminPassword2026!';
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);

      await prisma.admin.create({
        data: {
          id: 'admin_initial_id_' + Date.now(),
          username,
          passwordHash,
        },
      });
      console.log(`[Null-Auth Backend] Created initial admin user: '${username}'`);
    }

    isSeeded = true;
  } catch (error) {
    console.error('[Null-Auth Backend] Auto-migration/seeding error:', error);
  }
}

export default async function handler(req: any, res: any) {
  await ensureTablesAndAdmin();
  return app(req, res);
}
