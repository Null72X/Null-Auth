import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient; dbInitialized?: boolean };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Auto-add version and downloadUrl columns to Supabase PostgreSQL database if missing
if (!globalForPrisma.dbInitialized) {
  globalForPrisma.dbInitialized = true;
  prisma.$executeRawUnsafe(`
    ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "version" TEXT NOT NULL DEFAULT '1.0.0';
    ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "downloadUrl" TEXT;
  `).catch(() => {});
}
