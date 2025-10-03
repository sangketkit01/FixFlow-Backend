import Task from "../../models/Task.js";
import mongoose from "mongoose";

/**
 * @desc    ดึงรายการงานทั้งหมดที่ถูกมอบหมายให้ช่างคนนั้นๆ
 * @route   GET /api/technician/tasks/my-tasks
 */
export const getMyTasks = async (req, res) => {
    try {
        const technicianId = req.technician.id; // รับ ID จาก Middleware

        if (!technicianId) {
            return res.status(401).json({ message: "ไม่ได้รับอนุญาต, ไม่พบ ID ของช่าง" });
        }

        const tasks = await Task.find({ 
            technician_id: new mongoose.Types.ObjectId(technicianId)
        })
        .populate("username", "firstName lastName phone")
        .sort({ createdAt: -1 });

        if (!tasks || tasks.length === 0) {
            return res.status(404).json({ message: "ไม่พบงานที่ถูกมอบหมายสำหรับ ID นี้" });
        }
        
        res.status(200).json(tasks);
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูลงาน:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดบนเซิร์ฟเวอร์" });
    }
};

/**
 * @desc    ช่างกดรับงานที่ยังว่าง
 * @route   PATCH /api/technician/tasks/:taskId/accept
 */
export const acceptTask = async (req, res) => {
    try {
        const technicianId = req.technician.id;
        const { taskId } = req.params;
        const task = await Task.findById(taskId);

        if (!task) {
            return res.status(404).json({ message: "ไม่พบงานที่ระบุ" });
        }
        if (task.technician_id) {
            return res.status(400).json({ message: "งานนี้มีช่างรับไปแล้ว" });
        }

        task.technician_id = technicianId;
        task.status = 'fixing';

        const updatedTask = await task.save();
        res.status(200).json({ message: "รับงานสำเร็จ", task: updatedTask });
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการรับงาน:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดบนเซิร์ฟเวอร์" });
    }
};