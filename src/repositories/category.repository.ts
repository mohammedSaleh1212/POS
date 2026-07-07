// src/repositories/category.repository.ts

import { prisma } from "../db/prisma";
import { Prisma } from "../generated/prisma";
import { CreateCategoryDTO } from "../services/category.service";

export const categoryRepository = {
  create: async (data: CreateCategoryDTO) => {
    return prisma.category.create({
      data,
    });
  },

  findAll: async () => {
    return prisma.category.findMany();
  },

  findById: async (id: number) => {
    return prisma.category.findUnique({
      where: { id },
    });
  },

  update: async (
    id: number,
    data: CreateCategoryDTO
  ) => {
    return prisma.category.update({
      where: { id },
      data,
    });
  },

  delete: async (id: number) => {
    return prisma.category.delete({
      where: { id },
    });
  },
  findByName: async (name: string) => {
  return prisma.category.findUnique({
    where: { name },
  });
},
};