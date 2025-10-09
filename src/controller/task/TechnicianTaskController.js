import Task from "../../models/Task.js";
import User from "../../models/User.js";
import TaskImage from "../../models/TaskImage.js";
import mongoose from "mongoose";
import Payment from "../../models/Payment.js";
import PaymentDetail from "../../models/PaymentDetail.js";
import TaskType from "../../models/TaskType.js";

/**
 * @desc    ดึงรายการงานทั้งหมดที่ถูกมอบหมายให้ช่างคนนั้นๆ
 * @route   GET /api/technician/tasks/my-tasks
 */
export const getMyTasks = async (req, res) => {
    try {
        const technician_username = req.technician.username;

        if (!technician_username) {
            return res
                .status(401)
                .json({ message: "ไม่ได้รับอนุญาต, ไม่พบ username ของช่าง" });
        }

        // กรองเฉพาะงานที่ไม่ใช่ pending
        const tasks = await Task.find({
            technician_id: technician_username,
            status: { $ne: 'pending' }  // ← เพิ่มเงื่อนไข status ไม่เท่ากับ pending
        }).sort({ createdAt: -1 });

        // ดึงข้อมูล user มาเองแทนการใช้ populate เพราะ username เป็น String
        const tasksWithUserData = await Promise.all(
            tasks.map(async (task) => {
                const user = await User.findOne({ username: task.username }).select('firstName lastName phone');
                return {
                    ...task.toObject(),
                    userInfo: user
                };
            })
        );

        if (!tasksWithUserData || tasksWithUserData.length === 0) {
            return res.status(200).json([]);
        }

        res.status(200).json(tasksWithUserData);
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูลงาน:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดบนเซิร์ฟเวอร์" });
    }
};
// PUT /technician/tasks/:taskId/status
export const updateTaskStatus = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status } = req.body;

        if (!req.technician || !req.technician.username) {
            return res.status(401).json({ message: "ไม่ได้รับอนุญาต, ไม่พบข้อมูลช่าง" });
        }

        const technicianUsername = req.technician.username;

        if (!status) {
            return res.status(400).json({ message: "กรุณาระบุสถานะที่ต้องการเปลี่ยน" });
        }

        const validStatuses = [
            "accepted",
            "fixing",
            "payment",
            "successful",
            "failed",
            "request_canceling",
        ];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: "สถานะที่ระบุไม่ถูกต้อง" });
        }

        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ message: "รหัสงานไม่ถูกต้อง" });
        }

        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: "ไม่พบงานที่ระบุ" });
        }

        if (task.technician_id !== technicianUsername) {
            return res.status(403).json({ message: "คุณไม่มีสิทธิ์แก้ไขงานนี้" });
        }

        // อนุญาตการเปลี่ยนสถานะ
        const statusTransitions = {
            pending: ["accepted"],
            accepted: ["fixing", "request_canceling"],
            fixing: ["payment", "failed"],
            payment: ["successful"],
            successful: [],
            failed: [],
            cancelled: [],
            request_canceling: [],
        };

        const allowedTransitions = statusTransitions[task.status] || [];
        if (!allowedTransitions.includes(status)) {
            return res.status(400).json({
                message: `ไม่สามารถเปลี่ยนสถานะจาก "${task.status}" เป็น "${status}" ได้`,
            });
        }

        // ✅ อัปเดตสถานะใหม่
        task.status = status;
        await task.save();

        const user = await User.findOne({ username: task.username }).select(
            "name phone email"
        );

        res.status(200).json({
            message: `อัปเดตสถานะงานเป็น "${status}" เรียบร้อยแล้ว`,
            task: {
                ...task.toObject(),
                userInfo: user,
            },
        });
    } catch (error) {
        console.error("Error updating task status:", error);
        res.status(500).json({
            message: "เกิดข้อผิดพลาดในการอัปเดตสถานะงาน",
            error: error.message,
        });
    }
};



export const getAvailableTasks = async (req, res) => {
    try {
        const tasks = await Task.find({
            technician_id: null,
            status: 'pending'
        }).sort({ createdAt: -1 });

        const tasksWithUserData = await Promise.all(
            tasks.map(async task => {
                const user = await User.findOne({ username: task.username }).select('firstName lastName phone');
                return { ...task.toObject(), userInfo: user };
            })
        );

        res.json(tasksWithUserData);

    } catch (error) {
        console.error('Error fetching available tasks:', error);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลงาน'
        });
    }
};



export const acceptTask = async (req, res) => {
    try {
        const taskId = req.params.id;
        const technicianUsername = req.technician.username;

        if (!technicianUsername) {
            return res.status(401).json({ message: 'ไม่ได้รับอนุญาต, ไม่พบข้อมูลช่าง' });
        }

        const task = await Task.findById(taskId);

        if (!task) {
            return res.status(404).json({ message: 'ไม่พบงานนี้' });
        }

        if (task.technician_id !== null) {
            return res.status(400).json({
                message: 'งานนี้ถูกรับไปแล้ว'
            });
        }

        const updatedTask = await Task.findByIdAndUpdate(
            taskId,
            {
                technician_id: technicianUsername,
                status: 'accepted'
            },
            { new: true }
        );

        if (!updatedTask) {
            return res.status(404).json({ message: 'ไม่สามารถอัปเดตงานได้' });
        }

        const user = await User.findOne({ username: updatedTask.username }).select('firstName lastName phone');
        const taskWithUserData = {
            ...updatedTask.toObject(),
            userInfo: user
        };

        res.json({
            message: 'รับงานสำเร็จ',
            task: taskWithUserData
        });
    } catch (error) {
        console.error('Error accepting task:', error);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการรับงาน'
        });
    }
};


/**
 * @desc    ดึงข้อมูลงานชิ้นเดียวตาม ID
 * @route   GET /api/technician/tasks/:taskId
 */
export const getTaskById = async (req, res) => {
    try {
        const { taskId } = req.params;
        const technicianUsername = req.technician.username;

        // ตรวจสอบว่า taskId เป็น ObjectId ที่ถูกต้องหรือไม่
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ message: "รหัสงานไม่ถูกต้อง" });
        }

        const task = await Task.findById(taskId);

        if (!task) {
            return res.status(404).json({ message: "ไม่พบงานที่ระบุ" });
        }

        // ตรวจสอบความปลอดภัย: ช่างต้องเป็นเจ้าของงานเท่านั้นถึงจะดูได้
        if (task.technician_id !== technicianUsername) {
            return res.status(403).json({ message: "คุณไม่มีสิทธิ์เข้าถึงงานนี้" });
        }

        const taskType = await TaskType.findById(task.task_type_id);

        const payment = await Payment.findOne({ task_id: taskId });

        let paymentDetail = null;
        if (payment) {
            paymentDetail = await PaymentDetail.find({ payment_id: payment._id });
        }
        // เพิ่มข้อมูล userInfo ลงใน task
        // ส่งข้อมูลกลับไปให้ Frontend (ตรงกับที่ Frontend คาดหวัง)
        res.status(200).json({ task: task, payment: payment, paymentDetail: paymentDetail, taskType: taskType });

    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูลงาน:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดบนเซิร์ฟเวอร์" });
    }
};

/**
 * @desc    ดึงรูปภาพทั้งหมดของงานชิ้นเดียวตาม ID
 * @route   GET /api/technician/tasks/:taskId/images
 */
export const getTaskImages = async (req, res) => {
    try {
        const { taskId } = req.params;
        const technicianUsername = req.technician.username;

        // ตรวจสอบ ObjectId
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ message: "รหัสงานไม่ถูกต้อง" });
        }

        // ตรวจสอบก่อนว่าช่างเป็นเจ้าของงานจริง เพื่อความปลอดภัย
        const parentTask = await Task.findById(taskId);
        if (!parentTask || parentTask.technician_id !== technicianUsername) {
            return res.status(403).json({ message: "คุณไม่มีสิทธิ์ดูรูปภาพของงานนี้" });
        }

        // ค้นหารูปภาพทั้งหมดที่ task_id ตรงกัน
        const images = await TaskImage.find({ task_id: taskId });

        // ส่งข้อมูลกลับไปให้ Frontend (ตรงกับที่ Frontend คาดหวัง)
        res.status(200).json({ images: images });

    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงรูปภาพ:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดบนเซิร์ฟเวอร์" });
    }
};


// export const getMyTasksPending = async (req, res) => {
//   try {
//     const technician_username = req.technician.username;
//     if (!technician_username) {
//       return res
//         .status(401)
//         .json({ message: "ไม่ได้รับอนุญาต, ไม่พบ username ของช่าง" });
//     }

//     // เพิ่มเงื่อนไข status: "pending"
//     const tasks = await Task.find({
//       technician_id: technician_username,
//       status: "pending"
//     }).sort({ createdAt: -1 });

//     // ดึงข้อมูล user มาเองแทนการใช้ populate เพราะ username เป็น String
//     const tasksWithUserData = await Promise.all(
//       tasks.map(async (task) => {
//         const user = await User.findOne({ username: task.username }).select('firstName lastName phone');
//         return {
//           ...task.toObject(),
//           userInfo: user
//         };
//       })
//     );

//     if (!tasksWithUserData || tasksWithUserData.length === 0) {
//       return res.status(200).json([]);
//     }

//     res.status(200).json(tasksWithUserData);
//   } catch (error) {
//     console.error("เกิดข้อผิดพลาดในการดึงข้อมูลงาน:", error);
//     res.status(500).json({ message: "เกิดข้อผิดพลาดบนเซิร์ฟเวอร์" });
//   }
// };



