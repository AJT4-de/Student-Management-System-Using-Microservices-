import express, { json } from "express";
import { config } from "dotenv";
import connectDB from "./config/db.js";
import studentRoute from "./routes/studentRoute.js";
import { correlationIdMiddleware } from "../correlationId.js";

config();
// to read env
const app = express();
 
//connect to db
connectDB();

// middleware
app.use(json());
app.use(correlationIdMiddleware);

app.use("/api/students",studentRoute);

const PORT =process.env.PORT||5003;
app.listen(PORT,() => {
    console.log(`Student service is running on port ${PORT}`);
});
 