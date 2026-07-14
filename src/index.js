import "dotenv/config.js";
import mongoose from "mongoose";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { connectDB } from "./db/index.js";
import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";

const app = express()
const PORT = process.env.PORT || 3000

const corsOptions = {
    origin: [process.env.CLIENT_URL, "https://projectfrontend-one.vercel.app", "http://localhost:5173"].filter(Boolean),
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
    credentials: true
}

app.use(cors(corsOptions))

app.use(express.json())
app.use(cookieParser())

app.use(async (req, res, next) => {
    const uri = process.env.MONGODB_URI;
    if (!uri || uri.includes("<db_password>")) {
        console.error("MONGODB_URI is missing.");
        return res.status(500).json({ message: "Database config error" });
    }
    
    // Check if we are already connected (1 = connected, 2 = connecting)
    if (mongoose.connection.readyState !== 1 && mongoose.connection.readyState !== 2) {
        try {
            await connectDB(uri);
            console.log("MongoDB connected for request");
        } catch (err) {
            console.error("MongoDB connection failed:", err.message);
            return res.status(500).json({ message: "Database connection failed" });
        }
    }
    next();
});

app.use("/api/users", userRoutes)
app.use("/api/auth", authRoutes)

if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`)
    })
}

export default app