const express = require("express");
const dotenv = require("dotenv");
const rateLmit = require("express-rate-limit");
const publicKeyRoute = require("./routes/auth/publicKeyRoute");
const loginRoute = require("./routes/auth/loginRoute");
const { correlationIdMiddleware } = require("../correlationId");
const { authServiceLogger } = require("../logging");

dotenv.config();

const limiter = rateLmit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: "Too many requests from this IP, please try again later.",
  headers: true,
});

// Initialize express app
const app = express();

// Middleware
app.use(express.json());
app.use(correlationIdMiddleware);
app.use(limiter);

// Public Key
app.use("/.well-known/jwks.json", publicKeyRoute);

// Routes
app.use("/api/login", loginRoute);

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  authServiceLogger.info(`Auth Server running on port ${PORT}`);
});
