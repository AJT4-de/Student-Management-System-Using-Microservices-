const express = require("express");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");

const {
  generateJWTWithPrivateKey,
  fetchStudents,
  fetchProfessors,
} = require("./util");
const { ROLES } = require("../../../consts");
const { authServiceLogger } = require("../../../logging");

const router = express.Router();
dotenv.config();

router.post("/student", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const students = await fetchStudents();
    const student = students.find((s) => s.email === email);

    if (!student) {
      authServiceLogger.error(`Student not found for email: ${email}`);
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    if (!student.password) {
        authServiceLogger.error(
          `Password hash not found for student email: ${email}. Ensure studentService returns password hashes for AUTH_SERVICE.`
        );
        return res.status(500).json({ message: "Authentication error: Cannot verify password." });
    }

    const isMatch = await bcrypt.compare(password, student.password);

    if (!isMatch) {
      authServiceLogger.error(`Password mismatch for student email: ${email}`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const tokenPayload = {
      id: student._id,
      email: student.email,
      roles: [ROLES.STUDENT],
    };
    const token = generateJWTWithPrivateKey(tokenPayload);

    res.status(200).json({ token });
  } catch (error) {
    authServiceLogger.error(`Student login error: ${error.message}`);
    res.status(500).json({ message: "Server error during student login" });
  }
});

router.post("/professor", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const professors = await fetchProfessors();
    authServiceLogger.debug(
      `Professors fetched by authService: ${JSON.stringify(professors, null, 2)}`
    ); 
    const professor = professors.find((p) => p.email === email);

    authServiceLogger.debug(`Password${professor.password}`);
    if (!professor) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!professor.password) {
        authServiceLogger.error(
          `Password hash not found for professor email: ${email}. Ensure professorService returns password hashes for AUTH_SERVICE.`
        );
        return res.status(500).json({ message: "Authentication error: Cannot verify password." });
    }

    const isMatch = await bcrypt.compare(password, professor.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const tokenPayload = {
      id: professor._id,
      email: professor.email,
      roles: [ROLES.PROFESSOR],
    };
    const token = generateJWTWithPrivateKey(tokenPayload);

    res.status(200).json({ token });
  } catch (error) {
    authServiceLogger.error(`Professor login error: ${error.message}`);
    res.status(500).json({ message: "Server error during professor login" });
  }
});

router.post("/admin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      authServiceLogger.error("Admin credentials are not configured in .env file.");
      return res.status(500).json({ message: "Admin login configuration error." });
    }

    if (email === adminEmail && password === adminPassword) {
      const tokenPayload = {
        id: "admin_user", // Or a more specific admin user ID if you have one
        email: adminEmail,
        roles: [ROLES.ADMIN],
      };
      const token = generateJWTWithPrivateKey(tokenPayload);
      return res.status(200).json({ token });
    } else {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }
  } catch (error) {
    authServiceLogger.error(`Admin login error: ${error.message}`);
    res.status(500).json({ message: "Server error during admin login" });
  }
});

module.exports = router;