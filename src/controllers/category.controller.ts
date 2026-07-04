// src/controllers/category.controller.ts

import { Request, Response } from "express";
import * as categoryService from "../services/category.service";

export const create = async (
  req: Request,
  res: Response
) => {
  try {
    const category = await categoryService.createCategory(
      req.body
    );

    res.status(201).json(category);
  } catch (error: any) {
    res.status(400).json({
      error: error.message,
    });
  }
};

export const findAll = async (
  _req: Request,
  res: Response
) => {
  try {
    const categories =
      await categoryService.getCategories();

    res.json(categories);
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
    const category =
      await categoryService.getCategoryById(
        Number(req.params.id)
      );

    res.json(category);
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
    const category =
      await categoryService.updateCategory(
        Number(req.params.id),
        req.body
      );

    res.json(category);
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
    await categoryService.deleteCategory(
      Number(req.params.id)
    );

    res.status(204).send();
  } catch (error: any) {
    res.status(404).json({
      error: error.message,
    });
  }
};