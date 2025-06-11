const mongoose = require("mongoose");
const { courseServiceLogger } = require("../../logging");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    courseServiceLogger.info(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    courseServiceLogger.error(error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
