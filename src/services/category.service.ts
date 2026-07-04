// src/services/category.service.ts

import { Prisma } from "../generated/prisma";
import { categoryRepository } from "../repositories/category.repository";

export const createCategory = async (
  data: Prisma.CategoryCreateInput
) => {
const existing =
  await categoryRepository.findByName(data.name);

if (existing) {
  throw new Error("Category already exists");
}

  return categoryRepository.create(data);
};

export const getCategories = async () => {
  return categoryRepository.findAll();
};

export const getCategoryById = async (id: number) => {
  const category = await categoryRepository.findById(id);

  if (!category) {
    throw new Error("Category not found");
  }

  return category;
};

export const updateCategory = async (
  id: number,
  data: Prisma.CategoryUpdateInput
) => {
  const category = await categoryRepository.findById(id);

  if (!category) {
    throw new Error("Category not found");
  }

  return categoryRepository.update(id, data);
};

export const deleteCategory = async (id: number) => {
  const category = await categoryRepository.findById(id);

  if (!category) {
    throw new Error("Category not found");
  }

  return categoryRepository.delete(id);
};