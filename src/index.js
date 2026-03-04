import dotenv from "dotenv";
import app from "./app.js";
import logger from "./config/logger.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`✅ Server running on port ${PORT}`);
  logger.info(`🌐 Health check: http://localhost:${PORT}/api/health`);
  logger.info(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated");
  });
});
