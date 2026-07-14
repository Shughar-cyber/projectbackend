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

const connectMongoAtStartup = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri || uri.includes("<db_password>")) {
        console.error("MONGODB_URI is missing.");
        return;
    }

    if (mongoose.connection.readyState === 1) {
        console.log("MongoDB already connected at startup");
        return;
    }

    try {
        await connectDB(uri);
        console.log("MongoDB connected at startup");
    } catch (err) {
        console.error("MongoDB connection failed at startup:", err.message);
    }
}

const allowedOrigins = [
    process.env.CLIENT_URL,
    "https://projectfrontend-one.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
].filter(Boolean)

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error("Not allowed by CORS"))
        }
    },
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}

app.use(cors(corsOptions))

app.use(express.json())
app.use(cookieParser())

app.use(async (req, res, next) => {
    if (mongoose.connection.readyState !== 1 && mongoose.connection.readyState !== 2) {
        const uri = process.env.MONGODB_URI;
        if (!uri || uri.includes("<db_password>")) {
            console.error("MONGODB_URI is missing.");
            return res.status(500).json({ message: "Database config error" });
        }

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
    await connectMongoAtStartup();
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`)
    })
}

export default app