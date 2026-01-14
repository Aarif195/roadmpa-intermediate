import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;

let db;

export async function connectToMongo() {
  const client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  console.log("MongoDB connected:", dbName);
}

export function getDb() {
  if (!db) {
    throw new Error("Database not connected. Call connectToMongo() first.");
  }
  return db;
}
