import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ActivityLog from "../models/ActivityLog.js";
import { sendOtpEmail } from "../lib/email.js";

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

export async function register(req, res) {
  try {
    if (process.env.DEMO_MODE === "true") {
      return res.status(201).json({ id: "demo-user" });
    }
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.isVerified) {
        return res.status(409).json({ message: "Email already in use" });
      } else {
        // User exists but not verified. We update their OTP and resend
        const otp = generateOtp();
        existing.otp = otp;
        existing.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        existing.password = await bcrypt.hash(password, 10);
        existing.name = name;
        await existing.save();

        await sendOtpEmail(email, otp);
        return res.status(200).json({ email, message: "OTP resent for existing unverified account" });
      }
    }

    const hash = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await User.create({ name, email, password: hash, role: "member", otp, otpExpiry });

    // Log registration activity
    await ActivityLog.create({
      userId: user._id,
      type: 'user_register',
      description: `User ${email} registered`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await sendOtpEmail(email, otp);

    res.status(201).json({ email: user.email, message: "OTP sent to email" });
  } catch (e) {
    console.error('Registration error:', e);
    res.status(500).json({ message: "Server error" });
  }
}

export async function login(req, res) {
  try {
    if (process.env.DEMO_MODE === "true") {
      const { email = "demo@example.com" } = req.body || {};
      const token = jwt.sign(
        { id: "demo-user", role: "admin", email },
        process.env.JWT_SECRET || "demo-secret",
        { expiresIn: "7d" }
      );

      // Log demo login activity
      if (process.env.NODE_ENV === 'production') {
        await ActivityLog.create({
          userId: 'demo-user',
          type: 'user_login',
          description: 'Demo user login',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      }

      return res.json({ token });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify your email first", notVerified: true });
    }

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Log successful login activity
    await ActivityLog.create({
      userId: user._id,
      type: 'user_login',
      description: `User ${user.email} logged in`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    if (user.otp !== otp || user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, message: "Email verified successfully" });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function resendOtp(req, res) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "User already verified" });

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    await sendOtpEmail(email, otp);

    res.json({ message: "OTP resent successfully" });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getProfile(req, res) {
  try {
    if (process.env.DEMO_MODE === "true") {
      return res.json({
        id: "demo-user",
        name: "Demo User",
        email: "demo@example.com",
        phone: "+91 98765 43210",
        company: "Demo Company",
        role: "admin",
        notifications: {
          email: true,
          sms: false,
          push: true,
          marketing: false
        },
        preferences: {
          darkMode: true,
          language: "en",
          currency: "INR"
        }
      });
    }

    const userId = req.user.id;
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      company: user.company || "",
      role: user.role,
      notifications: user.notifications || {
        email: true,
        sms: false,
        push: true,
        marketing: false
      },
      preferences: user.preferences || {
        darkMode: true,
        language: "en",
        currency: "INR"
      }
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateProfile(req, res) {
  try {
    if (process.env.DEMO_MODE === "true") {
      return res.json({
        id: "demo-user",
        name: req.body.name || "Demo User",
        email: "demo@example.com",
        phone: req.body.phone || "+91 98765 43210",
        company: req.body.company || "Demo Company",
        role: "admin",
        notifications: req.body.notifications || {
          email: true,
          sms: false,
          push: true,
          marketing: false
        },
        preferences: req.body.preferences || {
          darkMode: true,
          language: "en",
          currency: "INR"
        }
      });
    }

    const userId = req.user.id;
    const { name, phone, company, notifications, preferences } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        name,
        phone,
        company,
        notifications,
        preferences
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone || "",
      company: updatedUser.company || "",
      role: updatedUser.role,
      notifications: updatedUser.notifications || {
        email: true,
        sms: false,
        push: true,
        marketing: false
      },
      preferences: updatedUser.preferences || {
        darkMode: true,
        language: "en",
        currency: "INR"
      }
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
