// src/controllers/category.controller.ts

import { Request, Response } from "express";
import * as categoryService from "../services/category.service";

export const create = async (
  req: Request,
  res: Response
) => {
    const category = await categoryService.createCategory(
      req.body
    );

    res.status(201).json(category);
};

export const findAll = async (
  _req: Request,
  res: Response
) => {
    const categories =
      await categoryService.getCategories();

    res.json(categories);
};

export const findById = async (
  req: Request,
  res: Response
) => {
    const category =
      await categoryService.getCategoryById(
        Number(req.params.id)
      );

    res.json(category);

};

export const update = async (
  req: Request,
  res: Response
) => {
  
    const category =
      await categoryService.updateCategory(
        Number(req.params.id),
        req.body
      );

    res.json(category);
  
};

export const remove = async (
  req: Request,
  res: Response
) => {
    await categoryService.deleteCategory(
      Number(req.params.id)
    );

  res.status(200).json({
    message: "CATEGORY_DELETED"
  });
};