import { getDb } from "../db.js";
import { nanoid } from "nanoid";

// createShortUrl
export async function createShortUrl(req, res) {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: "url is required" });

        const db = getDb();
        const shortCode = nanoid(6); // 6 code
        const now = new Date();

        // new object to insert
        const newUrl = {
            url,
            shortCode,
            createdAt: now,
            updatedAt: now
        };

        // Insert into MongoDB
        const result = await db.collection("urls").insertOne(newUrl);

        const { _id, ...rest } = newUrl;
        res.status(201).json({
            id: result.insertedId.toString(),
            ...rest
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
}

// getOriginalUrl
export async function getOriginalUrl(req, res) {
    try {
        const { shortCode } = req.params;
        const db = getDb();

        const urlDoc = await db.collection("urls").findOne({ shortCode });
        if (!urlDoc) return res.status(404).json({ error: "Short URL not found" });

        // Optional: increment clicks
        await db.collection("urls").updateOne(
            { shortCode },
            { $inc: { clicks: 1 } }
        );

        const updatedDoc = await db.collection("urls").findOne({ shortCode });

        res.json({
            id: urlDoc._id.toString(),
            url: urlDoc.url,
            shortCode: urlDoc.shortCode,
            createdAt: urlDoc.createdAt,
            updatedAt: urlDoc.updatedAt,
            accessCount: updatedDoc.clicks

        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
}

// updateShortUrl
export async function updateShortUrl(req, res) {
    try {
        const { shortCode } = req.params;
        const { url } = req.body;

        if (!url) return res.status(400).json({ error: "url is required" });

        console.log("Updating shortCode:", shortCode);
        const db = getDb();
        const now = new Date();

        const found = await db.collection("urls").findOne({ shortCode: "pYj_Gh" });
        console.log("Found document:", found);


        const result = await db.collection("urls").findOneAndUpdate(
            { shortCode },
            { $set: { url, updatedAt: now } },
            { returnDocument: "after" }
        );

        console.log("Update result:", result);

        if (!result) return res.status(404).json({ error: "Short URL not found" });

        res.json({
            id: result._id.toString(),
            url: result.url,
            shortCode: result.shortCode,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
}

// deleteShortUrl
export async function deleteShortUrl(req, res) {
    try {
        const { shortCode } = req.params;
        const db = getDb();

        const result = await db.collection("urls").deleteOne({ shortCode });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: "Short URL not found" });
        }

        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
}

// getUrlStats
export async function getUrlStats(req, res) {
    try {
        const { shortCode } = req.params;
        const db = getDb();

        const urlDoc = await db.collection("urls").findOne({ shortCode });
        if (!urlDoc) return res.status(404).json({ error: "Short URL not found" });

        res.json({
            id: urlDoc._id.toString(),
            url: urlDoc.url,
            shortCode: urlDoc.shortCode,
            createdAt: urlDoc.createdAt,
            updatedAt: urlDoc.updatedAt,
            accessCount: urlDoc.clicks
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
}
