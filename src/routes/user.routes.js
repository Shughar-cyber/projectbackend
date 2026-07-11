import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/dashboard", protect, (req, res) => {
  res.status(200).json({
    message: `Welcome back, ${req.user.name}`,
    user: { id: req.user._id, name: req.user.name, email: req.user.email },
  });
});

router.patch("/profile", protect, async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name && !email) {
      return res.status(400).json({ message: "Provide a name or email to update" });
    }

    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (existing) {
        return res.status(400).json({ message: "Email is already in use" });
      }
    }

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
      returnDocument: "after",
      runValidators: true,
    });

    res.status(200).json({
      message: "Profile updated successfully",
      user: { id: updatedUser._id, name: updatedUser.name, email: updatedUser.email, createdAt: updatedUser.createdAt },
    });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong", error: error.message });
  }
});

export default router;