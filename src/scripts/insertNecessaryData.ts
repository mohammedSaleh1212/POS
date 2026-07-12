import bcrypt from "bcrypt";
import { prisma } from "../db/prisma";


async function main() {
  console.log("🚀 Starting data initialization...");

  // 1. Create Role
  const role = await prisma.role.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "Admin",
      permissions: ["create_invoice", "delete_product", "manage_shifts"]
    }
  });
  console.log("✅ Role created:", role.name);

  // 2. Create Admin User
  const hashedPassword = await bcrypt.hash("121212", 10);
  const user = await prisma.user.upsert({
    where: { email: "admin@system.com" },
    update: {},
    create: {
      fullName: "System Admin",
      email: "admin@system.com",
      passwordHash: hashedPassword,
      roleId: role.id
    }
  });
  console.log("✅ Admin user created:", user.email);

  console.log("🎉 Initialization complete!");
}

main()
  .catch((e) => {
    console.error("❌ Initialization failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });