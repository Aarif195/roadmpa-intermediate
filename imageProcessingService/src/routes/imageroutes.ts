import express from "express";
import { upload } from "../config/cloudinary";
import { authenticate } from "../middleware/authenticate";
import {
  getUploadSignature, // New
  saveImageRecord,
  transformImage,
  getImage, listImages, deleteImage
} from "../controllers/imageController";

// rate limit
import rateLimit from "express-rate-limit";

const router = express.Router();

// Defining the Limits
const transformLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes time window
  max: 30, // Maximum 30 requests allowed user
  keyGenerator: (req: any) => req.user.id,
  message: {
    status: 429,
    message: "Too many transformation requests. Please wait 15 minutes.",
  },
});

// uploadImage
// router.post("/upload", authenticate, upload.single("image"), uploadImage);

router.get("/upload-signature", authenticate, getUploadSignature);

// 2. Save the metadata after Frontend uploads to Cloudinary
router.post("/save", authenticate, saveImageRecord);

// transformImage
router.post("/:id/transform", authenticate, transformLimiter, transformImage);

// getImage
router.get("/:id", authenticate, getImage);

// listImages
router.get("/", authenticate, listImages);

// deleteImage
router.delete("/:id", authenticate, deleteImage);


export default router;

