import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

globalForPrisma.prisma = prisma;

export async function ensureDbSchema() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ClientUser" ADD COLUMN IF NOT EXISTS "plainPassword" TEXT;`);
    console.log('[DB] ensureDbSchema executed: plainPassword column checked/added.');
  } catch (err: any) {
    // Non-fatal if table doesn't exist yet in dev/test or column already exists
    console.warn('[DB] ensureDbSchema warning:', err?.message || err);
  }
}

