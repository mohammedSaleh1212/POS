// src/repositories/product.repository.ts

import { prisma } from "../db/prisma";
import { Prisma } from "../generated/prisma";

export const productRepository = {
  create: async (data: Prisma.ProductCreateInput) => {
    return prisma.product.create({ data });
  },

  findAll: async () => {
    return prisma.product.findMany();
  },

  findById: async (id: number) => {
    return prisma.product.findUnique({
      where: { id },
    });
  },

  update: async (
    id: number,
    data: Prisma.ProductUpdateInput
  ) => {
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