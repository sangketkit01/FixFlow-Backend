import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import connectDB from "./src/config/db.js";
import cookieParser from "cookie-parser";
import userRouter from "./src/routes/userRoute.js";

dotenv.config();

const app = express();
connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));
app.use(cookieParser());

app.use("/user", userRouter)

app.use((req, res, next) => {
    res.status(404).json({ "message": "Route not found" })
})

app.use((err, req, res, next) => {
    console.log(err.stack);
    res.status(500).json({ "message": "Server Error" })
})

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Server start at http://localhost:${port}`)
})