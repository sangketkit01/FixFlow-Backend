import express from "express";
import { body } from "express-validator";
import { LoginTechnician } from "../controller/IndexController.js";
import upload from "../middleware/Upload.js";
import { TechnicianRegister } from "../controller/TechnicianController.js";
<<<<<<< HEAD
import { getMyTasks, updateTaskStatus } from "../controller/task/TechnicianTaskController.js";
=======
import { getAvailableTasks, acceptTask, getMyTasks, updateTaskStatus } from "../controller/task/TechnicianTaskController.js";
>>>>>>> fes
import { authTechnician } from "../middleware/TechnicianMiddleware.js";
import Technician from "../models/Technician.js";

const technicianRouter = express.Router();

technicianRouter.get("/me", authTechnician, async (req, res) => {
  try {
    const technicianer = await Technician.findOne({ username: req.technician.username }).select("-password");
    if (!technicianer) return res.status(404).json({ message: "Technician not found" });

    res.json({
      ...technicianer.toObject(),
      role: "technician"
    });
  } catch (err) {
    console.error("Technicianer /me error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

technicianRouter.post("/login", [
  body("username").isString().notEmpty().withMessage("Username must be provided"),
  body("password").isString().isLength({ min: 8 }).notEmpty().withMessage("Password must be at least 8 characters long")
], LoginTechnician);

technicianRouter.post("/register", upload.single("technician_registration_id_card_image"), [
  body("full_name").isString().notEmpty().withMessage("Fullname must be provided"),
  body("email").isString().isEmail().notEmpty().withMessage("Invalid email"),
  body("phone").isString().isLength({ min: 10, max: 10 }).notEmpty().withMessage("Invalid phone number"),
  body("age").isInt({ min: 1 }).withMessage("Age must be a number and at least 1"),
  body("id_card").isString().isLength({ min: 13, max: 13 }).notEmpty().withMessage("Invalid ID card number"),
  body("address").isString().notEmpty().withMessage("Address must be not empty"),
  body("district").isString().notEmpty().withMessage("District must be provided"),
  body("province").isString().notEmpty().withMessage("Province must be provided"),
  body("birth_date").isDate().notEmpty().withMessage("Birth date must be provided")
], TechnicianRegister);

// GET: ดึงงานที่ยังไม่มีช่างรับ
technicianRouter.get("/tasks/available", authTechnician, getAvailableTasks);

// PUT: รับงาน (ใส่ technician_id และเปลี่ยนสถานะ)
technicianRouter.put("/tasks/:id/accept", authTechnician, acceptTask);

// GET: ดึงรายการงานของช่าง
technicianRouter.get("/tasks/my-tasks", authTechnician, getMyTasks);

// PUT: อัปเดตสถานะงาน
technicianRouter.put("/tasks/:taskId/status", authTechnician, updateTaskStatus);

export default technicianRouter;

