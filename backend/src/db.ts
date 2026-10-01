import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient; dbMigrated?: boolean };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Auto-migrate Supabase PostgreSQL table columns safely
export async function ensureDbSchema() {
  if (globalForPrisma.dbMigrated) return;

  const migrations = [
    `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "version" TEXT NOT NULL DEFAULT '1.0.0';`,
    `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "downloadUrl" TEXT;`,
    `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "freeTrialEnabled" BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "freeTrialKey" TEXT;`,
    `ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "discordWebhookUrl" TEXT;`,
    `ALTER TABLE "License" ADD COLUMN IF NOT EXISTS "notes" TEXT;`,
    `ALTER TABLE "HwidAccess" ADD COLUMN IF NOT EXISTS "notes" TEXT;`,
    `CREATE TABLE IF NOT EXISTS "ClientUser" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "username" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "appId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "boundHwid" TEXT,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "notes" TEXT,
      "firstActivatedAt" TIMESTAMP(3),
      "lastLoginAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ClientUser_appId_fkey" FOREIGN KEY ("appId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "ClientUser_appId_username_key" ON "ClientUser"("appId", "username");`,
  ];

  for (const sql of migrations) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (err) {
      // Ignore migration errors if already exists
    }
  }

  // Normalize existing applications: strip 'NA-' and 'nas_' prefixes
  try {
    const existingApps = await prisma.application.findMany();
    for (const app of existingApps) {
      const cleanAppId = app.appId.startsWith('NA-') ? app.appId.substring(3) : app.appId;
      const cleanSecret = app.secret.startsWith('nas_') ? app.secret.substring(4) : app.secret;
      if (cleanAppId !== app.appId || cleanSecret !== app.secret) {
        await prisma.application.update({
          where: { id: app.id },
          data: { appId: cleanAppId, secret: cleanSecret },
        });
      }
    }
  } catch (err) {
    // Ignore if table not yet ready
  }

  globalForPrisma.dbMigrated = true;
}

// Run initial migration promise
ensureDbSchema().catch(() => {});
