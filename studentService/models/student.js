import { Schema, model } from "mongoose";
import { genSalt, hash } from "bcrypt";

// Define the Student Schema
const studentSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
        minLenght: 6,
    },
});

studentSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        return next();
    }
    try {
        const salt = await genSalt(10);
        const hashedPassword = await hash(this.password, salt);
        this.password = hashedPassword;
        next();
    } catch (error) {
        return next(error);
    }
});


// Create the Student model
const Student = model("Student", studentSchema);

export default Student;
