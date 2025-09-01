import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import morgan from "morgan";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json);

app.use(morgan("dev"));

app.use((req, res, next) => {
    res.status(404).json({ "message": "Route not found" })
})

app.use((err, req, res, next) => {
    console.log(err.stack);
    res.status(500).json({ "message": "Server Error" })
})

const port = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server start at http://localhost:${port}`)
})
