import Task from "../../models/Task.js";
import mongoose from "mongoose";

/**
 * @desc    ดึงรายการงานทั้งหมดที่ถูกมอบหมายให้ช่างคนนั้นๆ
 * @route   GET /api/technician/tasks/my-tasks
 */
export const getMyTasks = async (req, res) => {
    try {
        const technician_username = req.technician.username;

        if (!technician_username) {
            return res.status(401).json({ message: "ไม่ได้รับอนุญาต, ไม่พบ ID ของช่าง" });
        }

        const tasks = await Task.find({
            technician_id: technician_username,
        })
        .populate({
            path: 'username',           // ระบุ field ที่จะ populate ใน collection 'tasks'
            foreignField: 'username',   // ระบุ field ที่จะใช้เทียบค่าใน collection 'users'
            select: 'firstName lastName phone' // ระบุ field ที่ต้องการดึงมาจาก 'users'
        })
        .sort({ createdAt: -1 });

        if (!tasks) {
            return res.status(200).json([]);
        }

        res.status(200).json(tasks);
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูลงาน:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดบนเซิร์ฟเวอร์" });
    }
};

/**
 * @desc    ช่างอัปเดตสถานะงาน
 * @route   PUT /api/technician/tasks/:taskId/status
 */
export const updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    const technicianUsername = req.technician.username;

    // ... (โค้ด validation เหมือนเดิม) ...

    // --- จุดที่ 1: ค้นหางานโดย "ไม่ต้อง" populate ---
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        message: 'ไม่พบงานที่ระบุ'
      });
    }

    // ตรวจสอบว่าเป็นงานของช่างคนนี้หรือไม่
    if (task.technician_id.toString() !== technicianUsername) {
      return res.status(403).json({
        message: 'คุณไม่มีสิทธิ์แก้ไขงานนี้'
      });
    }
    
    // ... (โค้ดตรวจสอบ statusTransitions เหมือนเดิม) ...
    
    // อัปเดตสถานะ
    task.status = status;
    await task.save(); // <-- ตอนนี้จะ save ผ่านแล้ว

    // --- จุดที่ 2: populate ข้อมูล "หลังจาก" บันทึกสำเร็จ ---
    const populatedTask = await Task.findById(task._id).populate('username', 'firstName lastName phone');

    res.status(200).json({
      message: 'อัปเดตสถานะงานเรียบร้อยแล้ว',
      task: populatedTask // ส่งข้อมูลที่ populate แล้วกลับไป
    });

  } catch (error) {
    console.warn('Error updating task status:', error); 
    res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะงาน',
      error: error.message
    });
  }
};