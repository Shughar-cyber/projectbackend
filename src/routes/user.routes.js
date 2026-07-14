import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/dashboard", protect, (req, res) => {
  res.status(200).json({
    message: `Welcome back, ${req.user.username || req.user.name}`,
    user: {
      id: req.user._id,
      name: req.user.name,
      username: req.user.username,
      phone: req.user.phone,
      email: req.user.email,
    },
  });
});

router.patch("/profile", protect, async (req, res) => {
  try {
    const { name, username, phone, email } = req.body;

    if (!name && !username && !phone && !email) {
      return res.status(400).json({ message: "Provide a name, username, phone, or email to update" });
    }

    if (email) {
      const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.user._id } });
      if (existing) {
        return res.status(400).json({ message: "Email is already in use" });
      }
    }

    if (username) {
      const existing = await User.findOne({ username: username.toLowerCase(), _id: { $ne: req.user._id } });
      if (existing) {
        return res.status(400).json({ message: "Username is already in use" });
      }
    }

    if (phone) {
      const existing = await User.findOne({ phone: phone.trim(), _id: { $ne: req.user._id } });
      if (existing) {
        return res.status(400).json({ message: "Phone number is already in use" });
      }
    }

    const updates = {};
    if (name) updates.name = name;
    if (username) updates.username = username.toLowerCase();
    if (phone) updates.phone = phone.trim();
    if (email) updates.email = email.toLowerCase();

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
      returnDocument: "after",
      runValidators: true,
    });

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        username: updatedUser.username,
        phone: updatedUser.phone,
        email: updatedUser.email,
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong", error: error.message });
  }
});

export default router;