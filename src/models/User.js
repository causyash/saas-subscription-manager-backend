import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpiry: { type: Date },
    password: { type: String, required: true },
    phone: { type: String, default: "" },
    company: { type: String, default: "" },
    role: { type: String, enum: ["admin", "member", "viewer"], default: "member" },
    status: { type: String, enum: ["active", "inactive", "suspended"], default: "active" },
    lastLogin: { type: Date },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false }
    },
    preferences: {
      darkMode: { type: Boolean, default: true },
      language: { type: String, default: "en" },
      currency: { type: String, default: "INR" }
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);

