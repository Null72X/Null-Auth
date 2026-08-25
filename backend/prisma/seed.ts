import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const username = process.env.INITIAL_ADMIN_USERNAME || 'admin';
  const password = process.env.INITIAL_ADMIN_PASSWORD || 'NullAuthAdminPassword2026!';

  console.log(`[Null-Auth Seed] Checking initial admin account (${username})...`);

  const existingAdmin = await prisma.admin.findUnique({
    where: { username },
  });

  if (existingAdmin) {
    console.log(`[Null-Auth Seed] Admin account '${username}' already exists. Skipping creation.`);
    return;
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  await prisma.admin.create({
    data: {
      username,
      passwordHash,
    },
  });

  console.log(`[Null-Auth Seed] Successfully created initial admin account: '${username}'`);
}

main()
  .catch((e) => {
    console.error('[Null-Auth Seed Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
