import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import Subscription from "./models/Subscription.js";
import Payment from "./models/Payment.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables from the root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "..", ".env") });

async function seedDatabase() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI is not defined in the environment variables.");
    }

    console.log("Connecting to the database...");
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    // Clear existing data (optional, useful for clean seeds)
    console.log("Clearing existing data...");
    await User.deleteMany({});
    await Subscription.deleteMany({});
    await Payment.deleteMany({});

    // Hash passwords
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash("admin123", salt);
    const memberPassword = await bcrypt.hash("member123", salt);

    // Create Users
    console.log("Creating users...");
    const adminUser = await User.create({
      name: "Admin User",
      email: "admin@example.com",
      password: adminPassword,
      role: "admin",
    });

    const memberUser = await User.create({
      name: "Member User",
      email: "member@example.com",
      password: memberPassword,
      role: "member",
    });

    // Create Subscriptions
    console.log("Creating subscriptions...");
    const sub1 = await Subscription.create({
      userId: memberUser._id,
      softwareName: "Slack",
      category: "Communication",
      cost: 8,
      billingCycle: "Monthly",
      startDate: new Date(),
      renewalDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20), // 20 days from now
      paymentMethod: "Card",
      status: "Active",
      notes: "For team collaboration",
    });

    const sub2 = await Subscription.create({
      userId: memberUser._id,
      softwareName: "Zoom",
      category: "Meetings",
      cost: 15,
      billingCycle: "Monthly",
      startDate: new Date(),
      renewalDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10), // 10 days from now
      paymentMethod: "UPI",
      status: "Active",
      notes: "Pro account",
    });

    const sub3 = await Subscription.create({
      userId: adminUser._id,
      softwareName: "AWS",
      category: "Cloud",
      cost: 50,
      billingCycle: "Monthly",
      startDate: new Date(),
      renewalDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5), // 5 days from now
      paymentMethod: "Card",
      status: "Active",
      notes: "Production hosting",
    });

    // Create Payments
    console.log("Creating payments...");
    await Payment.create([
      {
        userId: memberUser._id,
        subscriptionId: sub1._id,
        amount: 8,
        paymentDate: new Date(),
        paymentMethod: "Card",
        transactionId: "TXN-" + Date.now().toString(),
      },
      {
        userId: adminUser._id,
        subscriptionId: sub3._id,
        amount: 50,
        paymentDate: new Date(),
        paymentMethod: "Card",
        transactionId: "TXN-" + (Date.now() + 1).toString(),
      },
    ]);

    console.log("Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seedDatabase();
