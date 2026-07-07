// src/services/category.service.ts

import { AppError } from "../middlewares/errorHandler";
import { categoryRepository } from "../repositories/category.repository";
import { z } from 'zod';

export const createCategorySchema = z.object({

    name: z.string().min(2, "CATEGORY_NAME_TOO_SHORT"),

});

// Extract just the body payload type for your service
export type CreateCategoryDTO = z.infer<typeof createCategorySchema>;

export const createCategory = async (
  data: CreateCategoryDTO
) => {
const existing =
  await categoryRepository.findByName(data.name);

if (existing) {
  throw new AppError(
    409,
    "CATEGORY_ALREADY_EXISTS"
  );
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
  data: CreateCategoryDTO
) => {
  const category = await categoryRepository.findById(id);

  if (!category) {
    throw new AppError(404, "CATEGORY_NOT_FOUND");
  }

  return categoryRepository.update(id, data);
};

export const deleteCategory = async (id: number) => {
  const category = await categoryRepository.findById(id);

  if (!category) {
    throw new AppError(404, "CATEGORY_NOT_FOUND");
  }

  return categoryRepository.delete(id);
};