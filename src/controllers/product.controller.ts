// src/controllers/product.controller.ts

import { Request, Response } from "express";
import * as productService from "../services/product.service";

import { z } from 'zod';


export const createProductSchema = z.object({
  name: z.string().min(2, "Product_name_required"),
  
  sku: z.string().min(3, "SKU_required").optional().nullable(),
  
  barcode: z.string().length(13, "Barcode_must_be_exactly_13_characters").optional().nullable(),
  
  costPrice: z.coerce.number().nonnegative("Cost_price_must_be_positive_or_zero"),
  
  sellingPrice: z.coerce.number().positive("Selling_price_must_be_greater_than_zero").optional(),
    
  categoryId: z.number().int().positive("Invalid_category_ID").optional().nullable()
});

export const updateProductSchema = z.object({
  name: z.string().min(2, "Product_name_must_be_at_least_2_characters").optional(),
  
  sku: z.string().min(3, "SKU_must_be_at_least_3_characters").optional().nullable(),
  
  barcode: z.string().length(13, "Barcode_must_be_exactly_13_characters").optional().nullable(),
  
  costPrice: z.coerce.number().nonnegative("Cost_price_must_be_positive_or_zero").optional(),
  
  sellingPrice: z.coerce.number().positive("Selling_price_must_be_greater_than_zero").optional(),
  
  
  categoryId: z.number().int().positive("Invalid_category_ID").optional().nullable()
});



export type UpdateProductDTO = z.infer<typeof updateProductSchema>;
export type CreateProductDTO = z.infer<typeof createProductSchema>;

export const create = async (req: Request, res: Response) => {
    const product = await productService.createProduct(req.body);

    res.status(201).json(product);
};

export const findAll = async (_req: Request, res: Response) => {
    const products = await productService.getProducts();

    res.json(products);

};

export const findById = async (
  req: Request,
  res: Response
) => {
    const product = await productService.getProductById(
      Number(req.params.id)
    );

    res.json(product);

};

export const update = async (
  req: Request,
  res: Response
) => {
    const product = await productService.updateProduct(
      Number(req.params.id),
      req.body
    );

    res.json(product);

};

export const remove = async (
  req: Request,
  res: Response
) => {
    await productService.deleteProduct(
      Number(req.params.id)
    );

    res.status(200).json({ message: "Product_deleted_successfully" });

};