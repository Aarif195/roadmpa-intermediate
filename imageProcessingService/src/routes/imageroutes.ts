import express from "express";
import { upload } from "../config/cloudinary";
import { authenticate } from "../middleware/authenticate";
import {
  uploadImage,
  transformImage,
  getImage, listImages
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
router.post("/upload", authenticate, upload.single("image"), uploadImage);

// transformImage
router.post("/:id/transform", authenticate, transformLimiter, transformImage);

// getImage
router.get("/:id", authenticate, getImage);

// listImages
router.get("/", authenticate, listImages);


export default router;

