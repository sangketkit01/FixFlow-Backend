import express from 'express';
import { getUnassignedTasks, getUserHistoryTasks, getUserTasks } from '../controller/task/TaskController.js';
import { authTechnician } from '../middleware/TechnicianMiddleware.js';
import { authUser } from "../middleware/UserAuthMiddleware.js";
import { createTask } from "../controller/task/TaskController.js";
import upload from "../middleware/Upload.js";

const taskRouter = express.Router();

// กำหนดว่าถ้ามีการ GET request มาที่ /unassigned ให้ไปเรียกใช้ getUnassignedTasks
// โดยต้องผ่านด่าน authTechnician ก่อน
taskRouter.post("/create", authUser, upload.array("task_image", 5), createTask)
taskRouter.get('/unassigned', authTechnician, getUnassignedTasks);

taskRouter.get("/my-tasks", authUser, getUserTasks)

export default taskRouter;