// src/controllers/product.controller.ts

import { Request, Response } from "express";
import * as productService from "../services/product.service";

import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Product name is required"),
    sku: z.string().min(3, "SKU is required"),
    barcode: z.string().length(13, "Barcode must be exactly 13 characters").nullable().optional(),
    price: z.coerce.number().positive("Price must be greater than zero"),
    stockQuantity: z.number().int().nonnegative("Stock cannot be negative"),
    categoryId: z.number().int().positive("Invalid category ID")
  })
});
// product.schema.ts
export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    sku: z.string().min(3).optional(),
    price: z.coerce.number().positive().optional(),
  })
});

export type UpdateProductDTO = z.infer<typeof updateProductSchema>['body'];
export type CreateProductDTO = z.infer<typeof createProductSchema>['body'];

export const create = async (req: Request, res: Response) => {
  try {
    const product = await productService.createProduct(req.body);

    res.status(201).json(product);
  } catch (error: any) {
    res.status(400).json({
      error: error.message,
    });
  }
};

export const findAll = async (_req: Request, res: Response) => {
  try {
    const products = await productService.getProducts();

    res.json(products);
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
    });
  }
};

export const findById = async (
  req: Request,
  res: Response
) => {
  try {
    const product = await productService.getProductById(
      Number(req.params.id)
    );

    res.json(product);
  } catch (error: any) {
    res.status(404).json({
      error: error.message,
    });
  }
};

export const update = async (
  req: Request,
  res: Response
) => {
  try {
    const product = await productService.updateProduct(
      Number(req.params.id),
      req.body
    );

    res.json(product);
  } catch (error: any) {
    res.status(400).json({
      error: error.message,
    });
  }
};

export const remove = async (
  req: Request,
  res: Response
) => {
  try {
    await productService.deleteProduct(
      Number(req.params.id)
    );

    res.status(204).send();
  } catch (error: any) {
    res.status(404).json({
      error: error.message,
    });
  }
};