const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Course = require("./models/course"); // Assuming this script is in the root of courseService
// You might need to fetch a valid Professor ID or have one ready
// For example, if you have a Professor service and know an ID:
// const SOME_PROFESSOR_ID = "enter_a_valid_professor_id_here"; 

dotenv.config(); // Load environment variables from .env file

const sampleCourses = [
  {
    name: "Introduction to Computer Science",
    code: "CS101",
    description: "Fundamental concepts of computer science, including algorithms, data structures, and programming.",
    schedule: {
      days: ["Monday", "Wednesday", "Friday"],
      time: "09:00 AM - 10:00 AM"
    },
    createdBy: "683de66dab2fd8289319e7e2", // Replace with an actual Professor's ObjectId
  },
  {
    name: "Calculus I",
    code: "MATH101",
    description: "Introduction to differential and integral calculus.",
    schedule: {
      days: ["Tuesday", "Thursday"],
      time: "11:00 AM - 12:30 PM"
    },
    createdBy: "683de66dab2fd8289319e7e3", // Replace with an actual Professor's ObjectId
  },
  {
    name: "Physics for Engineers",
    code: "PHY101",
    description: "Basic principles of physics relevant to engineering disciplines.",
    schedule: {
      days: ["Monday", "Wednesday"],
      time: "01:00 PM - 02:30 PM"
    },
    createdBy: "683de66dab2fd8289319e7e4", // Replace with an actual Professor's ObjectId
  }
];

const seedDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not defined in your .env file.");
    process.exit(1);
  }

  // IMPORTANT: You need to provide a valid Professor ID for the 'createdBy' field.
  // You can fetch one from your database or hardcode one for seeding purposes if you know one.
  // For this script to run as is, you'll need to manually set a valid ID below
  // or modify the script to fetch one.
  
  const defaultProfessorId = "683de66dab2fd8289319e7e3"; // <<<<<<< IMPORTANT: REPLACE THIS!

  if (defaultProfessorId === "REPLACE_WITH_ACTUAL_PROFESSOR_ID") {
    console.warn("************************************************************************************");
    console.warn("WARNING: 'defaultProfessorId' is not set in seedCourses.js.");
    console.warn("Please replace 'REPLACE_WITH_ACTUAL_PROFESSOR_ID' with a real Professor ObjectId string.");
    console.warn("The script will try to proceed, but courses might fail validation if 'createdBy' is required and not valid.");
    console.warn("************************************************************************************");
  }
  
  const coursesToSeed = sampleCourses.map(course => ({
      ...course,
      createdBy: course.createdBy || defaultProfessorId // Assign a default if not specified
  }));


  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected for course seeding...");

    // Optional: Clear existing courses before seeding
    // await Course.deleteMany({});
    // console.log("Existing courses cleared.");

    await Course.insertMany(coursesToSeed);
    console.log(`${coursesToSeed.length} sample courses have been added successfully!`);

  } catch (error) {
    console.error("Error seeding courses database:", error.message);
    if (error.errors) {
        for (let field in error.errors) {
            console.error(`Validation error for ${field}: ${error.errors[field].message}`);
        }
    }
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected after course seeding.");
  }
};

seedDB();