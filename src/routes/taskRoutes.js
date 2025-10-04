import express from 'express';
import { getUnassignedTasks } from '../controller/task/TaskController.js';
import { authTechnician } from '../middleware/TechnicianMiddleware.js'; // ตรวจสอบ Path ของ Middleware ให้ถูกต้อง

const router = express.Router();

// กำหนดว่าถ้ามีการ GET request มาที่ /unassigned ให้ไปเรียกใช้ getUnassignedTasks
// โดยต้องผ่านด่าน authTechnician ก่อน
router.get('/unassigned', authTechnician, getUnassignedTasks);

export default router;