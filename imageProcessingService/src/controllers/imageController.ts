import { Request, Response } from "express";
import {  sendError } from "../utils/helpers";
import { User } from "../types/users";

import { AuthRequest } from "../middleware/authenticate";
import { ImageService } from "../Service/image.service";


// getUploadSignature
export async function getUploadSignature(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized");

    const settings = ImageService.getPresignedSettings();

    res.status(200).json(settings);
  } catch (err) {
    sendError(res, "Error generating upload signature");
  }
}

// saveImageRecord
export async function saveImageRecord(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized");

    // The frontend sends these details in the request body
    const image = await ImageService.saveRecord(req.user._id!, req.body);

    res.status(201).json({
      message: "Image record saved successfully",
      image,
    });
  } catch (err) {
    console.error(err);
    sendError(res, "Error saving image record");
  }
}

// transformImage
export async function transformImage(req: Request, res: Response) {
  try {
    const { id } = req.params 
    const { transformations } = req.body;

    const result = await ImageService.transform(id as string, transformations);

    if (!result) return sendError(res, "Image not found");

    res.status(200).json({
      message: "Transformation applied",
      originalUrl: result.originalUrl,
      transformedUrl: result.transformedUrl,
      metadata: {
        appliedTransformations: transformations,
      },
    });
  } catch (err) {
    sendError(res, "Error transforming image");
  }
}

// getImage
export async function getImage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { format } = req.query;

    const result = await ImageService.getById(id as string, format as string);

    if (!result) return sendError(res, "Image not found");

    res.status(200).json(result);
  } catch (err) {
    sendError(res, "Error retrieving image");
  }
}

// listImages
export async function listImages(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized");

    // 1. Get query params and set defaults
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await ImageService.list(req.user._id!, page, limit);

    // 3. Return images and pagination metadata
    res.status(200).json(result);
  } catch (err) {
    sendError(res, "Error listing images");
  }
}

// deleteImage
export async function deleteImage(req: AuthRequest, res: Response) {
  try {
    if (!req.user?._id) return sendError(res, "Unauthorized");

    const { id } = req.params;
    const result = await ImageService.delete(id as string, req.user._id);

    if (result.status === 404) return sendError(res, result.message!);
    if (result.status === 401) return sendError(res, result.message!);

    res.status(204).send();
  } catch (err) {
    sendError(res, "Error deleting image");
  }
}