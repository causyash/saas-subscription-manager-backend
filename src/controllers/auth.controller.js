import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ActivityLog from "../models/ActivityLog.js";

export async function register(req, res) {
  try {
    if (process.env.DEMO_MODE === "true") {
      return res.status(201).json({ id: "demo-user" });
    }
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({ 
      name, 
      email, 
      password: hash, 
      role: "member", 
      isVerified: true  // Skip OTP verification - set as verified automatically
    });

    // Log registration activity
    await ActivityLog.create({
      userId: user._id,
      type: 'user_register',
      description: `User ${email} registered`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Automatically generate a token for the newly registered user
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ 
      token,
      message: "User registered successfully" 
    });
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

    // Removed the email verification check to skip OTP verification

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

// Removed verifyOtp and resendOtp functions since we're skipping OTP verification

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