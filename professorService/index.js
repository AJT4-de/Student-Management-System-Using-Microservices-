const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

const professorRoute = require("./routes/professorRoute");
const { professorServiceLogger } = require("../logging");
const { correlationIdMiddleware } = require("../correlationId");

dotenv.config();

// Initialize express app
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(express.json());
app.use(correlationIdMiddleware);

app.use("/api/professors", professorRoute);

// Start server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  professorServiceLogger.info(`Professor Server running on port ${PORT}`);
  console.log(`Professor Server running on port ${PORT}`);
});
