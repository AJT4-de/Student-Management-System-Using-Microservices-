const mongoose = require("mongoose");
const { professorServiceLogger } = require("../../logging");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    professorServiceLogger.info(`MongoDB connected: ${conn.connection.host}`);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    professorServiceLogger.error(error);
  }
};

module.exports = connectDB;
