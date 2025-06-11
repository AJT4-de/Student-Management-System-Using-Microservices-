const express = require("express");
const Professor = require("../models/professor");
const bcrypt = require("bcrypt");
const router = express.Router();
const { verifyRole, restrictProfessorToOwnData } = require("./auth/util");
const { ROLES } = require("../../consts");

router.post(
  "/",
  verifyRole([ROLES.ADMIN, ROLES.AUTH_SERVICE]),
  async (req, res) => {
    try {
      const { name, email, phone, password } = req.body;

      if (!name || !email || !phone || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const existingProfessor = await Professor.findOne({
        $or: [{ email }, { phone }],
      });
      if (existingProfessor) {
        return res.status(409).json({ message: "Email or phone already exists" });
      }

      const professor = new Professor({ name, email, phone, password });
      await professor.save();

      const professorResponse = professor.toObject();
      delete professorResponse.password;

      res
        .status(201)
        .json({ message: "Professor created successfully", professor: professorResponse });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  }
);

router.get(
  "/",
  verifyRole([ROLES.ADMIN, ROLES.AUTH_SERVICE, ROLES.STUDENT_SERVICE, ROLES.COURSE_SERVICE, ROLES.ENROLLMENT_SERVICE]),
  async (req, res) => {
    try {
      const professors = await Professor.find();
      console.log("Professors fetched by get:", JSON.stringify(professors, null, 2)); 
      return res.status(200).json(professors);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  }
);

router.get(
  "/:id",
  verifyRole([ROLES.ADMIN, ROLES.AUTH_SERVICE, ROLES.PROFESSOR, ROLES.COURSE_SERVICE, ROLES.ENROLLMENT_SERVICE]),
  restrictProfessorToOwnData,
  async (req, res) => {
    try {
      const professor = await Professor.findById(req.params.id).select(
        "-password"
      );

      if (!professor) {
        return res.status(404).json({ message: "Professor not found" });
      }

      res.status(200).json(professor);
    } catch (error) {
      console.error(error);
      if (error.kind === "ObjectId") {
        return res.status(400).json({ message: "Invalid professor ID format" });
      }
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  }
);

router.put(
  "/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  restrictProfessorToOwnData,
  async (req, res) => {
    try {
      const { name, email, phone, password } = req.body;

      const updatedData = {};
      if (name) updatedData.name = name;
      if (email) updatedData.email = email;
      if (phone) updatedData.phone = phone;
      
      if (password && password.trim() !== "") {
        const salt = await bcrypt.genSalt(10);
        updatedData.password = await bcrypt.hash(password, salt);
      }

      if (email || phone) {
        const existingCheck = {};
        if (email) existingCheck.email = email;
        if (phone) existingCheck.phone = phone;
        
        const conflictingProfessor = await Professor.findOne({
          $or: [
            ...(email ? [{ email: email, _id: { $ne: req.params.id } }] : []),
            ...(phone ? [{ phone: phone, _id: { $ne: req.params.id } }] : [])
          ]
        });

        if (conflictingProfessor) {
          return res.status(409).json({ message: "Email or phone already in use by another professor." });
        }
      }

      const professor = await Professor.findByIdAndUpdate(
        req.params.id,
        updatedData,
        {
          new: true,
          runValidators: true,
        }
      ).select("-password");

      if (!professor) {
        return res.status(404).json({ message: "Professor not found" });
      }

      res
        .status(200)
        .json({ message: "Professor updated successfully", professor });
    } catch (error) {
      console.error(error);
       if (error.code === 11000 || error.message.includes("duplicate key")) {
        return res.status(409).json({ message: "Email or phone already exists after attempting update." });
      }
      if (error.kind === "ObjectId") {
        return res.status(400).json({ message: "Invalid professor ID format" });
      }
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  }
);

router.delete(
  "/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  restrictProfessorToOwnData,
  async (req, res) => {
    try {
      const professor = await Professor.findByIdAndDelete(req.params.id);

      if (!professor) {
        return res.status(404).json({ message: "Professor not found" });
      }
      
      const professorResponse = professor.toObject();
      delete professorResponse.password;

      res
        .status(200)
        .json({ message: "Professor deleted successfully", professor: professorResponse });
    } catch (error) {
      console.error(error);
       if (error.kind === "ObjectId") {
        return res.status(400).json({ message: "Invalid professor ID format" });
      }
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  }
);

module.exports = router;