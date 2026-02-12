import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { connectToMongo } from "./db";
import authroutes from "./routes/authroutes";
import imageroutes from "./routes/imageroutes";

dotenv.config();

const app = express();
app.use(express.json());
const port = process.env.PORT || 5000;

app.get("/", (req: Request, res: Response) => {
  res.send('Hello Dad ')
});

app.use("/auth", authroutes);
app.use("/api/images", imageroutes);


connectToMongo();

app.listen(port, () => console.log(`Server running on port ${port}`));
