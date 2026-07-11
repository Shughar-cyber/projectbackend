import "dotenv/config.js";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { connectDB } from "./db/index.js";
import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";

const app = express()
const PORT = process.env.PORT || 3000

const corsOptions = {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
    credentials: true
}

app.use(cors(corsOptions))

app.use(express.json())
app.use(cookieParser())
app.use("/api/users", userRoutes)
app.use("/api/auth", authRoutes)

const start = async () => {
    const uri = process.env.MONGODB_URI
    if (!uri || uri.includes("<db_password>")) {
        console.error("MONGODB_URI is missing or still contains <db_password> placeholder. Update .env and retry.")
        return
    }
    try {
        await connectDB(uri)
        console.log("MongoDB connected")
    } catch (err) {
        console.error("MongoDB connection failed:", err.message)
    }
}

start()

if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`)
    })
}

export default app