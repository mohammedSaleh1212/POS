// Adjust these relative paths if you place the script in a subfolder
import 'dotenv/config';
import { prisma } from '../db/prisma'; 
import { Prisma } from '../generated/prisma';
async function main() {
  console.log('Attempting to create a new product...');

  const newProduct = await prisma.product.create({
    data: {
      name: 'Mechanical Keyboard',
      // Using Prisma.Decimal because you mapped price to @db.Decimal(10, 2)
      price: new Prisma.Decimal(89.99), 
      stockQuantity: 50,
      sku: 'MK-1001',
      barcode: '847129481204'
    },
  });

  console.log('Product successfully created:');
  console.log(newProduct);
}

main()
  .catch((error) => {
    console.error('Fatal Error during execution:', error);
    process.exit(1);
  })
  .finally(async () => {
    // Always disconnect the client when the script finishes
    await prisma.$disconnect();
  });