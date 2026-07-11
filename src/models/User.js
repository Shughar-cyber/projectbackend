import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationCode: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    resetPasswordCode: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.createResetCode = function () {
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString(); // e.g. "483920"

  this.resetPasswordCode = crypto.createHash("sha256").update(resetCode).digest("hex");
  this.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetCode;
};

userSchema.methods.createEmailVerificationCode = function () {
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  this.emailVerificationCode = crypto.createHash("sha256").update(verificationCode).digest("hex");
  this.emailVerificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return verificationCode;
};

const User = mongoose.model("User", userSchema);

export default User;