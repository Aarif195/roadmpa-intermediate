import cloudinary from "../config/cloudinary";
import { getImageCollection } from "../utils/helpers";
import { ObjectId } from "mongodb";

// uploadImage
export class ImageService {
  static async uploadAndSave(file: Express.Multer.File, userId: ObjectId) {
    return new Promise((resolve, reject) => {
      // Upload to Cloudinary using a buffer stream
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "roadmap_images" },
        async (error, result) => {
          if (error || !result)
            return reject(new Error("Cloudinary upload failed"));

          // Save metadata to MongoDB
          const imageCol = getImageCollection();
          const newImage = {
            userId,
            publicId: result.public_id,
            url: result.secure_url,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            format: result.format,
            createdAt: new Date(),
          };

          const dbResult = await imageCol.insertOne(newImage);
          resolve({
            ...newImage,
            _id: dbResult.insertedId.toString(),
            userId: userId.toString(),
          });
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  // transformImage
  static async transform(id: string, transformations: any) {
    const imageCol = getImageCollection();
    const image = await imageCol.findOne({ _id: new ObjectId(id) });

    if (!image) return null;

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

    return {
      originalUrl: image.url,
      transformedUrl,
    };
  }

  // getImage
  static async getById(id: string, format?: string) {
    const imageCol = getImageCollection();
    const image = await imageCol.findOne({ _id: new ObjectId(id) });

    if (!image) return null;

    // If no format is requested, return the original image data exactly
    if (!format) {
      return image;
    }

    // If format is requested, generate new URL and include requestedFormat label
    const responseUrl = cloudinary.url(image.publicId, {
      format: format as string,
      secure: true,
    });

    return {
      ...image,
      url: responseUrl,
      requestedFormat: format,
    };
  }

// listImages
static async list(userId: ObjectId, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const imageCol = getImageCollection();
    const query = { userId };

    // 2. Fetch images and total count in parallel
    const [images, total] = await Promise.all([
      imageCol.find(query).skip(skip).limit(limit).toArray(),
      imageCol.countDocuments(query)
    ]);

    return {
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }, images
    };
  }

// deleteImage
static async delete(id: string, userId: ObjectId) {
    const imageCol = getImageCollection();

    // 1. Find the image and check ownership
    const image = await imageCol.findOne({ _id: new ObjectId(id) });

    if (!image) return { status: 404, message: "Image not found" };

    if (image.userId?.toString() !== userId.toString()) {
      return { status: 401, message: "Unauthorized to delete this image" };
    }

    // 2. Delete from Cloudinary
    await cloudinary.uploader.destroy(image.publicId);

    // 3. Delete from MongoDB
    await imageCol.deleteOne({ _id: new ObjectId(id) });

    return { status: 204 };
  }

}
