// src/controllers/product.controller.ts

import { Request, Response } from "express";
import * as productService from "../services/product.service";

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