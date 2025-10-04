import express from "express";
import { body } from "express-validator";

// Controller Imports
import { LoginTechnician, TestLoginTechnician } from "../controller/IndexController.js";
import { getMyTasks, acceptTask, updateTaskStatus } from "../controller/task/TechnicianTaskController.js"; 



// Middleware Imports
// import { authTechnician } from "../middleware/TechnicianMiddleware.js"; // <<< คอมเมนต์ Middleware จริงออกไปก่อน
import upload from "../middleware/Upload.js"; 

const technicianRouter = express.Router();

// Middleware ปลอมสำหรับ Bypass Login
const bypassAuth = (req, res, next) => {
  req.technician = {
    // ใส่ ObjectId ของช่างคนใดคนหนึ่งใน Database ของคุณตรงนี้
    // id: "68dac738c90b460a5dc72cb8" 
    id: "68e0349276591a4ab246ee33"
  };
  next(); // ไปยังฟังก์ชันถัดไป (getMyTasks)
};


// --- Routes ---

// Route สำหรับ Login
technicianRouter.post("/login", [
    body("username").isString().notEmpty().withMessage("Username must be provided"),
    body("password").isString().isLength({ min: 8 }).notEmpty().withMessage("Password must be at least 8 characters long")
], LoginTechnician);

// Route สำหรับ Register
technicianRouter.post("/register", upload.single("id_card_image"), [
    body("full_name").isString().notEmpty().withMessage("Fullname must be provided"),
    body("email").isString().isEmail().notEmpty().withMessage("Invalid email"),
    body("phone").isString().isLength({ min: 10, max: 10 }).notEmpty().withMessage("Invalid phone number"),
    body("age").isInt({ min: 1 }).withMessage("Age must be a number and at least 1"),
    body("id_card").isString().isLength({ min: 13, max: 13 }).notEmpty().withMessage("Invalid ID card number"),
    body("address").isString().notEmpty().withMessage("Address must be not empty"),
    body("district").isString().notEmpty().withMessage("District must be provided"),
    body("province").isString().notEmpty().withMessage("Province must be provided"),
    body("birth_date").isDate().notEmpty().withMessage("Birth date must be provided")
]);

// Route สำหรับดึงงานของช่าง (เรียกใช้ Middleware ปลอม)
technicianRouter.get("/tasks/my-tasks", bypassAuth, getMyTasks);
technicianRouter.patch("/tasks/:taskId/accept", bypassAuth, acceptTask);

// <<< 2. เพิ่ม Route สำหรับอัปเดตสถานะตรงนี้
technicianRouter.put("/tasks/:taskId/status", bypassAuth, updateTaskStatus);
technicianRouter.get("/test-login", TestLoginTechnician);


export default technicianRouter;