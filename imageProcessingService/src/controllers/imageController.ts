import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getImageCollection, sendError } from "../utils/helpers";
import { User } from "../types/users";
import { ObjectId } from "mongodb";

import cloudinary from "../config/cloudinary";
import { AuthRequest } from "../middleware/authenticate";

// uploadImage
export async function uploadImage(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized");
    if (!req.file) return sendError(res, "No file uploaded");

    // Upload to Cloudinary using a buffer stream
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "roadmap_images" },
      async (error, result) => {
        if (error || !result) return sendError(res, "Cloudinary upload failed");

        // Save metadata to MongoDB
        const imageCol = getImageCollection();
        const newImage = {
          userId: req.user!._id,
          publicId: result.public_id,
          url: result.secure_url,
          originalName: req.file?.originalname,
          mimetype: req.file?.mimetype,
          size: req.file?.size,
          format: result.format,
          createdAt: new Date(),
        };

        const dbResult = await imageCol.insertOne(newImage);

        res.status(201).json({
          message: "Image uploaded successfully",
          image: {
            ...newImage,
            _id: dbResult.insertedId.toString(),
            userId: req.user?._id ? req.user._id.toString() : "missing_id",
          },
        });
      },
    );

    uploadStream.end(req.file.buffer);
  } catch (err) {
    console.error(err);
    sendError(res, "Server error during upload");
  }
}

// transformImage
export async function transformImage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { transformations } = req.body;

    const imageCol = getImageCollection();
    const image = await imageCol.findOne({ _id: new ObjectId(id as string) });

    if (!image) return sendError(res, "Image not found");

    // Map the JSON body to Cloudinary transformation options
    const options: any[] = [];

    // 1. Resize & Crop
    if (transformations.resize) {
      options.push({
        width: transformations.resize.width,
        height: transformations.resize.height,
        crop: "scale",
      });
    }
    if (transformations.crop) {
      options.push({
        width: transformations.crop.width,
        height: transformations.crop.height,
        x: transformations.crop.x,
        y: transformations.crop.y,
        crop: "crop",
      });
    }

    // 2. Rotate, Flip, Mirror
    if (transformations.rotate) options.push({ angle: transformations.rotate });
    if (transformations.flip) options.push({ effect: "vflip" });
    if (transformations.mirror) options.push({ effect: "hflip" });

    // 3. Watermark (Using text as simple watermark)
    if (transformations.watermark) {
      options.push({
        overlay: {
          font_family: "Arial",
          font_size: 30,
          text: transformations.watermark,
        },
        gravity: "south_east",
        opacity: 50,
      });
    }

    // 4. Filters & Compression
    if (transformations.filters?.grayscale)
      options.push({ effect: "grayscale" });
    if (transformations.filters?.sepia) options.push({ effect: "sepia" });
    if (transformations.compress) options.push({ quality: "auto" });

    // Generate the transformed URL
    const transformedUrl = cloudinary.url(image.publicId, {
      transformation: options,
      secure: true,
      format: transformations.format || image.format,
    });

    res.status(200).json({
      message: "Transformation applied",
      originalUrl: image.url,
      transformedUrl,
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

    const imageCol = getImageCollection();
    const image = await imageCol.findOne({ _id: new ObjectId(id as string) });

    if (!image) return sendError(res, "Image not found");

    // If no format is requested, return the original image data exactly
    if (!format) {
      return res.status(200).json(image);
    }

    // If format is requested, generate new URL and include requestedFormat label
    const responseUrl = cloudinary.url(image.publicId, {
      format: format as string,
      secure: true,
    });

    res.status(200).json({
      ...image,
      url: responseUrl,
      requestedFormat: format,
    });
  } catch (err) {
    sendError(res, "Error retrieving image");
  }
}

// listImages
export async function listImages(req: AuthRequest, res: Response) {
  try {
    // 1. Get query params and set defaults
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const imageCol = getImageCollection();
    const query = { userId: req.user?._id };

    // 2. Fetch images and total count in parallel
    const [images, total] = await Promise.all([
      imageCol.find(query).skip(skip).limit(limit).toArray(),
      imageCol.countDocuments(query)
    ]);

    // 3. Return images and pagination metadata
    res.status(200).json({
      
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      images
    });
  } catch (err) {
    sendError(res, "Error listing images");
  }
}