import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import connectDB from "./src/config/db.js";
import cookieParser from "cookie-parser";
import userRouter from "./src/routes/UserRoute.js";
import technicianRouter from "./src/routes/TechnicianRoute.js";
import adminRouter from "./src/routes/AdminRoute.js";
import { Logout } from "./src/controller/IndexController.js";

dotenv.config();

const app = express();
connectDB();

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "htto://localhost:3030"
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));


app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));
app.use(cookieParser());
app.use("/images", express.static("public"));


app.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});


app.use("/user", userRouter)
app.use("/technician", technicianRouter)
app.use("/admin", adminRouter)

app.post("/logout", Logout)

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