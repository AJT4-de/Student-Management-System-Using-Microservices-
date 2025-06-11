const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  enrollmentDate: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true
});

enrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);

module.exports = Enrollment;