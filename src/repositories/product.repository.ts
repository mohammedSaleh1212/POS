import { prisma } from "../db/prisma";
import { Prisma } from "../generated/prisma"; // Assuming your path is correct

export const productRepository = {
  create: async (data: Prisma.ProductCreateInput) => {
    return prisma.product.create({ data });
  },

  findAll: async () => {
    return prisma.product.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  findById: async (id: number) => {
    return prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  update: async (id: number, data: Prisma.ProductUpdateInput) => {
    return prisma.product.update({
      where: { id },
      data,
    });
  },

  delete: async (id: number) => {
    return prisma.product.delete({
      where: { id },
    });
  },
};