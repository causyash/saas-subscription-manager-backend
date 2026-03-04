import mongoose from "mongoose";

export default async function connectDB() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI not set");
  
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  
  return mongoose.connect(uri, {
    // Mongoose 8 uses modern defaults; keep options minimal
    maxPoolSize: 10
  });
}
