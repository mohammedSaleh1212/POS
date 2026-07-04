// 1. Import the single instance of Prisma you configured
import { prisma } from '../db/prisma'; 

// 2. Import the auto-generated types from your custom output folder
import { Prisma } from '../generated/prisma';

// Use the exact generated type for creating a product
export const create = async (data: Prisma.ProductCreateInput) => {
  return prisma.product.create({
    data,
  });
};