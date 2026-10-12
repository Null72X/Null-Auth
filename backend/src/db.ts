import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

globalForPrisma.prisma = prisma;

let dbEnsured = false;
let dbEnsuringPromise: Promise<void> | null = null;

export async function ensureDbSchema(): Promise<void> {
  if (dbEnsured) return;
  if (!dbEnsuringPromise) {
    dbEnsuringPromise = (async () => {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "ClientUser" ADD COLUMN IF NOT EXISTS "plainPassword" TEXT;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "freeTrialPassword" TEXT;`);
        dbEnsured = true;
        console.log('[DB] ensureDbSchema executed: plainPassword and freeTrialPassword columns verified.');
      } catch (err: any) {
        console.warn('[DB] ensureDbSchema notice:', err?.message || err);
      } finally {
        dbEnsuringPromise = null;
      }
    })();
  }
  return dbEnsuringPromise;
}

