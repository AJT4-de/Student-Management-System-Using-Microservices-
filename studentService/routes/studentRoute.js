import express from 'express';
import Student from '../models/student.js';
import { verifyRole, restrictStudentToOwnData } from './auth/util.js';
import { ROLES } from '../../consts.js';
import { studentServiceLogger } from '../../logging.js';

const router = express.Router();

router.post('/', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Provide name, email, and password' });
    }

    try {
        const existingStudent = await Student.findOne({ email });
        if (existingStudent) {
            return res.status(400).json({ message: 'Student already exists' });
        }

        const student = new Student({ name, email, password });
        const savedStudent = await student.save();
        return res.status(201).json(savedStudent);
    } catch (error) {
        return res.status(500).json({ message: 'Unable to create student', error: error.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const students = await Student.find();
        studentServiceLogger.info(`Retrieved ${students.length} students`);
        return res.status(200).json(students);
    } catch (error) {
        return res.status(500).json({ message: 'Unable to retrieve students', error: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            studentServiceLogger.error(`Student not found for ID: ${req.params.id}`);
            return res.status(404).json({ message: 'Student not found' });
        }
        return res.status(200).json(student);
    } catch (error) {
        studentServiceLogger.error(`Error retrieving student by ID: ${error.message}`);
        return res.status(500).json({ message: 'Unable to retrieve student', error: error.message });
    }
});

router.put('/:id', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name && !email && !password) {
        return res.status(400).json({ message: 'Provide at least one field to update (name, email, or password)' });
    }

    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        if (name) student.name = name;
        if (email) {
            if (email !== student.email) {
                const existingStudent = await Student.findOne({ email });
                if (existingStudent) {
                    return res.status(400).json({ message: 'Email already in use by another student' });
                }
            }
            student.email = email;
        }
        if (password) student.password = password;

        const updatedStudent = await student.save();
        return res.status(200).json(updatedStudent);
    } catch (error) {
        if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
            return res.status(400).json({ message: 'Email already in use', error: error.message });
        }
        return res.status(500).json({ message: 'Unable to update student', error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const student = await Student.findByIdAndDelete(req.params.id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        return res.status(200).json({ message: 'Student deleted successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Unable to delete student', error: error.message });
    }
});

export default router;
