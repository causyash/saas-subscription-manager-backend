import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./lib/db.js";
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import compression from "compression";
import logger from "./config/logger.js";
import securityConfig from "./config/security.js";

dotenv.config();

const app = express();

// Security middleware
app.use(helmet(securityConfig.helmet));
app.use(cors(securityConfig.cors));
app.use(rateLimit(securityConfig.rateLimit));
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
} else {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use((err, req, res, next) => {
  logger.error(err.stack);
  const code = err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message || "Server error";
  
  res.status(code).json({ 
    message, 
    ...(process.env.NODE_ENV !== 'production' && { error: err.message })
  });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    const server = app.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT}`);
      logger.info(`🌐 Health check: http://localhost:${PORT}/api/health`);
      logger.info(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
      });
    });
  })
  .catch((err) => {
    logger.error("❌ Database connection failed:", err.message);
    process.exit(1);
  });