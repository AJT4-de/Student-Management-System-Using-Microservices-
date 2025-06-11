const express = require("express");
const Enrollment = require("../models/enrollment");
const router = express.Router();
const { enrollmentServiceLogger } = require("../../logging");

const {
  verifyRole,
  restrictStudentToOwnData,
  fetchStudents,
  fetchCourses,
  fetchStudentById,
  fetchCourseById,
} = require("./auth/util");
const { ROLES } = require("../../consts");

router.post(
  "/",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  async (req, res) => {
    try {
      const { studentId, courseId } = req.body;

      if (!studentId || !courseId) {
        return res
          .status(400)
          .json({ message: "Student ID and Course ID are required" });
      }

      const studentExists = await fetchStudentById(studentId);
      if (!studentExists) {
        return res.status(404).json({ message: "Student not found" });
      }

      const courseExists = await fetchCourseById(courseId);
      if (!courseExists) {
        return res.status(404).json({ message: "Course not found" });
      }

      const existingEnrollment = await Enrollment.findOne({ studentId, courseId });
      if (existingEnrollment) {
        return res.status(409).json({ message: "Student is already enrolled in this course" });
      }

      const newEnrollment = new Enrollment({
        studentId,
        courseId,
      });

      await newEnrollment.save();
      
      const populatedEnrollment = newEnrollment.toObject();
      populatedEnrollment.student = studentExists;
      populatedEnrollment.course = courseExists;

      res.status(201).json({ message: "Enrollment created successfully", enrollment: populatedEnrollment });

    } catch (error) {
      enrollmentServiceLogger.error(
        `Error creating enrollment: ${error.message}`
      );
      if (error.code === 11000) {
        return res.status(409).json({ message: "Student is already enrolled in this course (database constraint)." });
      }
      res.status(500).json({
        message: "Server Error: Unable to create enrollment",
        error: error.message,
      });
    }
  }
);

router.get(
  "/",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  async (req, res) => {
    try {
      const enrollments = await Enrollment.find().lean();

      if (enrollments.length > 0) {
        const studentIds = [...new Set(enrollments.map(e => e.studentId.toString()))];
        const courseIds = [...new Set(enrollments.map(e => e.courseId.toString()))];
        
        const studentsData = await fetchStudents();  
        const coursesData = await fetchCourses();

        const studentsMap = new Map(studentsData.map(s => [s._id.toString(), s]));
        const coursesMap = new Map(coursesData.map(c => [c._id.toString(), c]));

        const populatedEnrollments = enrollments.map(e => ({
          ...e,
          student: studentsMap.get(e.studentId.toString()) || { _id: e.studentId, name: "N/A" },
          course: coursesMap.get(e.courseId.toString()) || { _id: e.courseId, name: "N/A" },
        }));
        return res.status(200).json(populatedEnrollments);
      }
      
      res.status(200).json(enrollments);
    } catch (error) {
      enrollmentServiceLogger.error(
        `Error fetching enrollments: ${error.message}`
      );
      res.status(500).json({
        message: "Server Error: Unable to fetch enrollments",
        error: error.message,
      });
    }
  }
);

router.get(
  "/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR, ROLES.STUDENT, ROLES.ENROLLMENT_SERVICE, ROLES.AUTH_SERVICE]),
  async (req, res) => {
    try {
      const enrollment = await Enrollment.findById(req.params.id).lean();
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }

      if (req.user.roles.includes(ROLES.STUDENT) && enrollment.studentId.toString() !== req.user.id) {
          return res.status(403).json({ message: "Access forbidden: You can only access your own enrollments." });
      }
      
      const student = await fetchStudentById(enrollment.studentId);
      const course = await fetchCourseById(enrollment.courseId);

      const populatedEnrollment = {
        ...enrollment,
        student: student || { _id: enrollment.studentId, name: "Student data not found" },
        course: course || { _id: enrollment.courseId, name: "Course data not found" },
      };

      res.status(200).json(populatedEnrollment);
    } catch (error) {
      enrollmentServiceLogger.error(
        `Error fetching enrollment by ID: ${error.message}`
      );enrollmentServiceLogger.error(
        `Error fetching enrollment by ID: ${error.message}`
      );
      if (error.kind === "ObjectId") {
        return res.status(400).json({ message: "Invalid enrollment ID format" });
      }
      res.status(500).json({
        message: "Server Error: Unable to fetch enrollment",
        error: error.message,
      });
    }
  }
);

router.get(
  "/student/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR, ROLES.STUDENT]),
  restrictStudentToOwnData,
  async (req, res) => {
    try {
      const studentId = req.params.id;
      let enrollments = await Enrollment.find({ studentId }).lean();

      if (!enrollments.length) {
        return res
          .status(200)
          .json([]);
      }

      const courseIds = [...new Set(enrollments.map(e => e.courseId.toString()))];
      
      const coursesData = await fetchCourses();  
      const coursesMap = new Map(coursesData.map(c => [c._id.toString(), c]));

      const populatedEnrollments = enrollments.map(enrollment => ({
        ...enrollment,
        course: coursesMap.get(enrollment.courseId.toString()) || { _id: enrollment.courseId, name: "Course data not found" },
      }));

      res.status(200).json(populatedEnrollments);
    } catch (error) {
      enrollmentServiceLogger.error(
        `Error fetching enrollments by student ID: ${error.message}`
      );
      res.status(500).json({
        message: "Server Error: Unable to fetch enrollments for student",
        error: error.message,
      });
    }
  }
);

router.get(
  "/course/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  async (req, res) => {
    try {
      const courseId = req.params.id;
      let enrollments = await Enrollment.find({ courseId }).lean();

       if (!enrollments.length) {
        return res
          .status(200)
          .json([]);
      }

      const studentIds = [...new Set(enrollments.map(e => e.studentId.toString()))];
      const studentsData = await fetchStudents();
      const studentsMap = new Map(studentsData.map(s => [s._id.toString(), s]));
      
      const populatedEnrollments = enrollments.map(enrollment => ({
        ...enrollment,
        student: studentsMap.get(enrollment.studentId.toString()) || { _id: enrollment.studentId, name: "Student data not found" },
      }));

      res.status(200).json(populatedEnrollments);
    } catch (error) {
      enrollmentServiceLogger.error(
        `Error fetching enrollments by course ID: ${error.message}`
      );
      res.status(500).json({
        message: "Server Error: Unable to fetch enrollments for course",
        error: error.message,
      });
    }
  }
);

router.delete(
  "/:id",
  verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]),
  async (req, res) => {
    try {
      const enrollment = await Enrollment.findByIdAndDelete(req.params.id);

      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }

      res
        .status(200)
        .json({ message: "Enrollment deleted successfully", enrollment });
    } catch (error) {
      enrollmentServiceLogger.error(
        `Error deleting enrollment: ${error.message}`
      );
      if (error.kind === "ObjectId") {
        return res
          .status(400)
          .json({ message: "Invalid enrollment ID format" });
      }
      res.status(500).json({
        message: "Server Error: Unable to delete enrollment",
        error: error.message,
      });
    }
  }
);

module.exports = router;