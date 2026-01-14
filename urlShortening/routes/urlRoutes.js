import express from "express";
import { 
  createShortUrl, 
  getOriginalUrl, 
  updateShortUrl, 
  deleteShortUrl, 
  getUrlStats 
} from "../controllers/urlController.js";

const router = express.Router();

// Create a new short URL
router.post("/shorten", createShortUrl);

// Retrieve the original URL
router.get("/shorten/:shortCode", getOriginalUrl);

// Update an existing short URL
router.put("/shorten/:shortCode", updateShortUrl);

// Delete an existing short URL
router.delete("/shorten/:shortCode", deleteShortUrl);

// Get statistics for a short URL
router.get("/shorten/:shortCode/stats", getUrlStats);

export default router;
