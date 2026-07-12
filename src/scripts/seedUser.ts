// prisma/seed.ts
import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma';


async function main() {
  console.log('🌱 Starting database seeding...');

// 1. Ensure an Admin role exists
const adminRole = await prisma.role.upsert({
  where: { name: 'ADMIN' },
  update: {
    permissions: [
      'create_invoice',
      'view_reports',
      'manage_users',
      'manage_products'
    ]
  },
  create: {
    name: 'ADMIN',
    permissions: [
      'create_invoice',
      'view_reports',
      'manage_users',
      'manage_products'
    ],
  },
});
  console.log(`✅ Role checked/created: ${adminRole.name}`);

  // 2. Hash the raw password
  const rawPassword = '121212';
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(rawPassword, saltRounds);

  // 3. Create the test user
  const testUser = await prisma.user.upsert({
    where: { email: 'admin@system.com' },
    update: {
      passwordHash: passwordHash, // Update password if re-running script
      roleId: adminRole.id,
    },
    create: {
      fullName: 'System Administrator',
      email: 'admin@system.com',
      passwordHash: passwordHash,
      roleId: adminRole.id,
    },
  });

  console.log('✅ Test user seeded successfully:');
  console.log({
    id: testUser.id,
    email: testUser.email,
    passwordToUseInPostman: rawPassword,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });