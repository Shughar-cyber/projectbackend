import crypto from "crypto";
import User from "../models/User.js";
import { generateToken, setTokenCookie } from "../utils/generateToken.js";
import { sendEmail } from "../utils/sendEmail.js";

export const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are all required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "An account with that email already exists" });
    }

    const user = await User.create({ name, email, password });

    const verificationCode = user.createEmailVerificationCode();
    await user.save({ validateBeforeSave: false });

    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV] Verification code for ${user.email}: ${verificationCode}`);
    }

    try {
      await sendEmail({
        to: user.email,
        subject: "Verify your email",
        html: `
          <p>Hi ${user.name},</p>
          <p>Welcome to Shughar Enterprises. Your email verification code is:</p>
          <h2 style="letter-spacing: 4px;">${verificationCode}</h2>
          <p>This code expires in 10 minutes.</p>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError.message);
    }
    res.status(201).json({
      message: "Account created. Check your email for a verification code.",
      email: user.email,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        requiresVerification: true,
        email: user.email,
      });
    }

    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  res.status(200).json({ message: "Logged out successfully" });
};

export const getMe = async (req, res) => {
  res.status(200).json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      isVerified: req.user.isVerified,
      createdAt: req.user.createdAt,
    },
  });
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      const resetCode = user.createResetCode();
      await user.save({ validateBeforeSave: false });

      if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV] Password reset code for ${user.email}: ${resetCode}`);
      }

      try {
        await sendEmail({
          to: user.email,
          subject: "Your password reset code",
          html: `
            <p>Hi ${user.name},</p>
            <p>Your password reset code is:</p>
            <h2 style="letter-spacing: 4px;">${resetCode}</h2>
            <p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send reset email:", emailError.message);
      }
    }

    res.status(200).json({
      message: "If an account exists with that email, a reset code has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: "Email, code, and new password are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordCode: hashedCode,
      resetPasswordExpires: { $gt: Date.now() },
    }).select("+password +resetPasswordCode +resetPasswordExpires");

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    user.password = newPassword;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful. You can now log in." });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required" });
    }

    const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

    const user = await User.findOne({
      email: email.toLowerCase(),
      emailVerificationCode: hashedCode,
      emailVerificationExpires: { $gt: Date.now() },
    }).select("+emailVerificationCode +emailVerificationExpires");

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    user.isVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // Verification is complete — log them in now.
    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.status(200).json({
      message: "Email verified successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (user && !user.isVerified) {
      const verificationCode = user.createEmailVerificationCode();
      await user.save({ validateBeforeSave: false });

      if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV] Verification code for ${user.email}: ${verificationCode}`);
      }

      try {
        await sendEmail({
          to: user.email,
          subject: "Your new verification code",
          html: `
            <p>Hi ${user.name},</p>
            <p>Your new verification code is:</p>
            <h2 style="letter-spacing: 4px;">${verificationCode}</h2>
            <p>This code expires in 10 minutes.</p>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError.message);
      }
    }

    res.status(200).json({
      message: "If an unverified account exists with that email, a new code has been sent.",
    });
  } catch (error) {
    next(error);
  }
};