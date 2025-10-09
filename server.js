import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import connectDB from "./src/config/db.js";
import cookieParser from "cookie-parser";
import userRouter from "./src/routes/userRoute.js";
import technicianRouter from "./src/routes/TechnicianRoute.js";
import adminRouter from "./src/routes/AdminRoute.js";
import { Logout } from "./src/controller/IndexController.js";
import taskRouter from "./src/routes/taskRoutes.js";
import taskTypeRouter from "./src/routes/TaskTypeRoute.js";
import PaymentRouter from "./src/routes/PaymentRoute.js";


dotenv.config(); 




const app = express();
connectDB();

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3030"
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

app.get("/ping", (req, res) => {
    res.send("pong");
});

app.use("/user", userRouter)
app.use("/technician", technicianRouter)
app.use("/admin", adminRouter)
app.use("/task-type", taskTypeRouter)
app.use("/task", taskRouter);

app.post("/logout", Logout)
app.use("/api/tasks", taskRouter);
app.use("/admin/stats", PaymentRouter);


app.use((req, res, next) => {
    res.status(404).json({ "message": "Route not found" })
})

app.use((err, req, res, next) => {
    console.log(err.stack);
    res.status(500).json({ "message": "Server Error" })
})
process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED PROMISE:", err);
});



app.use(cors({
    origin: 'http://localhost:5173', 
    credentials: true,               
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Server start at http://localhost:${port}`)
})