import { Request, Response } from "express";
import * as productService from "../services/product.service";

export const createProduct = async (
  req: Request,
  res: Response
) => {
  const product = await productService.createProduct(
    req.body
  );

  res.status(201).json(product);
};

export const getProducts = async (
  req: Request,
  res: Response
) => {
  const products = await productService.getProducts();

  res.json(products);
};

export const getProduct = async (
  req: Request,
  res: Response
) => {
  const product = await productService.getProduct(
    Number(req.params.id)
  );

  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  res.json(product);
};

export const updateProduct = async (
  req: Request,
  res: Response
) => {
  const product = await productService.updateProduct(
    Number(req.params.id),
    req.body
  );

  res.json(product);
};

export const deleteProduct = async (
  req: Request,
  res: Response
) => {
  await productService.deleteProduct(
    Number(req.params.id)
  );

  res.status(204).send();
};