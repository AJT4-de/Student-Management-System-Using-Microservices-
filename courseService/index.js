const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const rateLmit = require("express-rate-limit");
const courseRoutes = require("./routes/courseRoute");
const { correlationIdMiddleware } = require("../correlationId");
const { courseServiceLogger } = require("../logging");

dotenv.config();

const jwtAuthrateLimit = rateLmit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: "Too many requests from this IP, please try again later.",
  headers: true,
  keyGenerator: (req) => req.user.id,
  handler: (req, res) => {
    res.status(429).json({
      Message: "Too many requests from this IP, please try again later."
    })
  }
});

// Initialize express app
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(express.json());
app.use(correlationIdMiddleware);

app.use("/api/courses", courseRoutes);

// Start server
const PORT = process.env.PORT || 5004;
app.listen(PORT, () => {
  courseServiceLogger.info(`Course Server running on port ${PORT}`);
});
