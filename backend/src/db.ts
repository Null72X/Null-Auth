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
    `CREATE TABLE IF NOT EXISTS "Setting" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "key" TEXT NOT NULL UNIQUE,
      "value" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
  ];

  for (const sql of migrations) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (err) {
      // Ignore migration errors if already exists
    }
  }

  globalForPrisma.dbMigrated = true;
}

// Run initial migration promise
ensureDbSchema().catch(() => {});
