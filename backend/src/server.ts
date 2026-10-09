import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import { testConnection } from "./config/db";
import venueRoutes from "./routes/venueRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import adminRoutes from "./routes/adminRoutes";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Middlewares
app.use(cors({
  origin: [FRONTEND_URL, "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Health Check Endpoint
app.get("/api/health", async (req, res) => {
  const dbOk = await testConnection();
  res.json({
    status: dbOk ? "UP" : "DEGRADED",
    service: "CampusBook Backend",
    timestamp: new Date().toISOString(),
    database: dbOk ? "CONNECTED" : "FAILED",
  });
});

// API Routes
app.use("/api/venues", venueRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.url}`,
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Start Server & Test Database Connection
async function startServer() {
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.warn("⚠️  Warning: Initial PostgreSQL connection check failed. Ensure PostgreSQL service is active on port 5432.");
  }

  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 CampusBook Backend running on http://localhost:${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🏢 Venues API:   http://localhost:${PORT}/api/venues`);
    console.log(`📋 Bookings API: http://localhost:${PORT}/api/bookings`);
    console.log(`🛡️  Admin API:    http://localhost:${PORT}/api/admin/pending`);
    console.log(`===============================================`);
  });
}

startServer();

export default app;
