import Task from "../../models/Task.js";
import mongoose from "mongoose";

/**
 * @desc    ดึงรายการงานทั้งหมดที่ถูกมอบหมายให้ช่างคนนั้นๆ
 * @route   GET /api/technician/tasks/my-tasks
 */
export const getMyTasks = async (req, res) => {
  try {
    const technicianId = req.technician.id; 

    if (!technicianId) {
      return res
        .status(401)
        .json({ message: "ไม่ได้รับอนุญาต, ไม่พบ ID ของช่าง" });
    }

    const tasks = await Task.find({
      technician_id: new mongoose.Types.ObjectId(technicianId),
    })
      .populate("username", "firstName lastName phone") 
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
 * @desc     ช่างกดรับงานที่ยังว่าง
 * @route    PATCH /api/technician/tasks/:taskId/accept
 */
export const acceptTask = async (req, res) => {
  try {
    const technicianId = req.technician.id;
    const { taskId } = req.params;

    // ใช้ findByIdAndUpdate เพื่อค้นหาและอัปเดตในขั้นตอนเดียว
    // เพิ่มเงื่อนไข `technician_id: null` เพื่อให้แน่ใจว่าจะรับได้แต่งานที่ยังว่างจริงๆ
    const updatedTask = await Task.findOneAndUpdate(
      { _id: taskId, technician_id: null }, // 1. เงื่อนไข: ค้นหางานจาก ID และต้องยังไม่มีช่าง
      {
        technician_id: technicianId, // 2. ข้อมูลที่ต้องการอัปเดต
        // status: "fixing", // สถานะจะถูกเปลี่ยนโดยช่างเองในขั้นตอนถัดไป
      },
      { new: true } // 3. ตัวเลือก: ให้ส่งค่า document ที่อัปเดตแล้วกลับมา
    );

    // ถ้า updatedTask เป็น null แปลว่าไม่เจอ Task ที่ตรงเงื่อนไข
    // (อาจเพราะ taskId ไม่มีอยู่จริง หรือมีคนรับงานตัดหน้าไปแล้ว)
    if (!updatedTask) {
      return res.status(404).json({ message: "ไม่พบงานที่ระบุ หรือมีช่างรับไปแล้ว" });
    }

    res.status(200).json({ message: "รับงานสำเร็จ", task: updatedTask });

  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการรับงาน:", error);
    // เพิ่มการตรวจสอบกรณี taskId ไม่ถูกต้อง
    if (error instanceof mongoose.Error.CastError) {
        return res.status(400).json({ message: "ID ของงานไม่ถูกต้อง" });
    }
    res.status(500).json({ message: "เกิดข้อผิดพลาดบนเซิร์ฟเวอร์" });
  }
};


/**
 * @desc    ช่างอัปเดตสถานะของงาน (แก้ไขใหม่ทั้งหมด)
 * @route   PUT /api/technician/tasks/:taskId/status
 */
export const updateTaskStatus = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status } = req.body;
        const technicianId = req.technician.id;

        // 1. ตรวจสอบข้อมูลนำเข้า
        const allowedStatuses = ["fixing", "successful", "failed"];
        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({ message: "สถานะที่ส่งมาไม่ถูกต้อง" });
        }

        // 2. ค้นหาและอัปเดตในขั้นตอนเดียว
        const updatedTask = await Task.findOneAndUpdate(
            { _id: taskId, technician_id: technicianId }, // เงื่อนไขการค้นหา (รวมการเช็คสิทธิ์)
            { status: status },                           // ข้อมูลที่ต้องการอัปเดต
            { new: true }                                 // ตัวเลือก: ให้ส่งข้อมูลใหม่กลับมา
        ).populate("username", "firstName lastName phone"); // .populate เพื่อให้ข้อมูลที่ส่งกลับไปครบถ้วน

        // 3. ตรวจสอบผลลัพธ์
        if (!updatedTask) {
            return res.status(404).json({ message: "ไม่พบงานที่ระบุ หรือคุณไม่มีสิทธิ์อัปเดตงานนี้" });
        }

        // 4. ส่งข้อมูลกลับ
        res.status(200).json({
            message: `อัปเดตสถานะเป็น '${status}' สำเร็จ`,
            task: updatedTask,
        });

    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการอัปเดตสถานะงาน:", error);
        if (error instanceof mongoose.Error.CastError) {
            return res.status(400).json({ message: "ID ของงานไม่ถูกต้อง" });
        }
        res.status(500).json({ message: "เกิดข้อผิดพลาดบนเซิร์ฟเวอร์" });
    }
};