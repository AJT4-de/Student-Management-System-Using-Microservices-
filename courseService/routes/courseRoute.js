const express = require("express");
const Course = require("../models/course");
const router = express.Router();
const { verifyRole, restrictCourseModificationToCreatorOrAdmin } = require("./auth/util");
const { ROLES } = require("../../consts");
const { default: rateLimit } = require("express-rate-limit");
const { courseServiceLogger } = require("../../logging");
const jwtAuthrateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

router.post(
  "/",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  async (req, res) => {
    try {
      req.body.createdBy = req.user.id;
      const course = new Course(req.body);
      await course.save();
      res.status(201).json(course);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ message: "Course code already exists.", error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }
);

router.get(
  "/",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR, ROLES.ENROLLMENT_SERVICE, ROLES.STUDENT_SERVICE]),
  async (req, res) => {
    try {
      const courses = await Course.find();
      res.status(200).json(courses);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get(
  "/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR, ROLES.ENROLLMENT_SERVICE, ROLES.STUDENT_SERVICE]),
  jwtAuthrateLimit,
  async (req, res) => {
    try {
      const course = await Course.findById(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.status(200).json(course);
    } catch (error) {
      if (error.kind === "ObjectId") {
        return res.status(400).json({ message: "Invalid course ID format" });
      }
      res.status(500).json({ error: error.message });
    }
  }
);

router.put(
  "/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  restrictCourseModificationToCreatorOrAdmin,
  async (req, res) => {
    try {
      if ("createdBy" in req.body) {
        delete req.body.createdBy;
      }
      const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.status(200).json(course);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ message: "Course code already exists.", error: error.message });
      }
       if (error.kind === "ObjectId") {
        return res.status(400).json({ message: "Invalid course ID format" });
      }
      res.status(400).json({ error: error.message });
    }
  }
);

router.delete(
  "/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  restrictCourseModificationToCreatorOrAdmin,
  async (req, res) => {
    try {
      const courseId = req.params.id;
      const course = await Course.findByIdAndDelete(courseId);

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.status(200).json({ message: "Course deleted successfully", course });
    } catch (error) {
      courseServiceLogger.error(error);
      if (error.kind === "ObjectId") {
        return res.status(400).json({ message: "Invalid course ID format" });
      }
      res
        .status(500)
        .json({ message: "Server Error: Unable to delete course" });
    }
  }
);

module.exports = router;