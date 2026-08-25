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
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "version" TEXT NOT NULL DEFAULT '1.0.0';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "downloadUrl" TEXT;`);
    globalForPrisma.dbMigrated = true;
  } catch (err) {
    // Ignore migration errors if already exists
  }
}

// Run initial migration promise
ensureDbSchema();
