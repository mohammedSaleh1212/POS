import { prisma } from "../db/prisma";


async function main() {
  console.log("⚠️  Truncating database...");

  // Delete in reverse order of dependencies to avoid Foreign Key conflicts
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.dailyMovement.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});

  console.log("✅ Database truncated successfully.");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());