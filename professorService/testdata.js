const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Professor = require("./models/professor"); // Assuming this script is in the root of professorService

dotenv.config(); // Load environment variables from .env file

const sampleProfessors = [
  {
    name: "Dr. Alice Smith",
    email: "alice.smith@example.com",
    phone: "123-456-7890",
    password: "password123", // This will be hashed by the pre-save hook
  },
  {
    name: "Dr. Bob Johnson",
    email: "bob.johnson@example.com",
    phone: "123-456-7891",
    password: "password456",
  },
  {
    name: "Dr. Carol Williams",
    email: "carol.williams@example.com",
    phone: "123-456-7892",
    password: "password789",
  },
];

const seedDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not defined in your .env file.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected for seeding...");

    // Optional: Clear existing professors before seeding
    // await Professor.deleteMany({});
    // console.log("Existing professors cleared.");

    await Professor.insertMany(sampleProfessors);
    console.log("Sample professors have been added successfully!");
  } catch (error) {
    console.error("Error seeding database:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");
  }
};

seedDB();