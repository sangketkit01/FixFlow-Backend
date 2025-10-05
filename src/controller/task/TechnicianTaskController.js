import Task from "../../models/Task.js";
import User from "../../models/User.js";
import mongoose from "mongoose";

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

    const tasks = await Task.find({
      technician_id: technician_username,
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

// PUT อัพเดทสถานะ
export const updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    // ตรวจสอบว่ามี req.technician หรือไม่
    if (!req.technician || !req.technician.username) {
      return res.status(401).json({
        message: 'ไม่ได้รับอนุญาต, ไม่พบข้อมูลช่าง'
      });
    }

    const technicianUsername = req.technician.username;

    // ตรวจสอบว่ามีการส่ง status มาหรือไม่
    if (!status) {
      return res.status(400).json({
        message: 'กรุณาระบุสถานะที่ต้องการเปลี่ยน'
      });
    }

    // ตรวจสอบว่า status ที่ส่งมาถูกต้องหรือไม่
    const validStatuses = ['accepted', 'fixing', 'successful', 'failed', 'request_canceling'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: 'สถานะที่ระบุไม่ถูกต้อง'
      });
    }

    // ตรวจสอบว่า taskId เป็น ObjectId ที่ถูกต้องหรือไม่
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        message: 'รหัสงานไม่ถูกต้อง'
      });
    }

    // ค้นหางานโดยใช้ username (string)
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        message: 'ไม่พบงานที่ระบุ'
      });
    }

    // ตรวจสอบว่างานนี้เป็นของช่างคนนี้หรือไม่
    if (task.technician_id !== technicianUsername) {
      return res.status(403).json({
        message: 'คุณไม่มีสิทธิ์แก้ไขงานนี้'
      });
    }

    // ตรวจสอบว่าสถานะปัจจุบันสามารถเปลี่ยนเป็นสถานะใหม่ได้หรือไม่
    const statusTransitions = {
      'pending': ['accepted'],
      'accepted': ['fixing', 'request_canceling'],
      'fixing': ['successful', 'failed'],
      'request_canceling': [],
      'successful': [],
      'failed': [],
      'cancelled': []
    };

    const allowedTransitions = statusTransitions[task.status] || [];
    if (!allowedTransitions.includes(status)) {
      return res.status(400).json({
        message: `ไม่สามารถเปลี่ยนสถานะจาก "${task.status}" เป็น "${status}" ได้`
      });
    }

    // อัปเดตสถานะโดยใช้ findByIdAndUpdate
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      {
        $set: {
          status: status,
          updatedAt: new Date()
        }
      },
      {
        new: true,
        runValidators: false,
        strict: false
      }
    );

    if (!updatedTask) {
      return res.status(404).json({
        message: 'ไม่สามารถอัปเดตงานได้'
      });
    }

    // ... (โค้ดตรวจสอบ statusTransitions เหมือนเดิม) ...

    // อัปเดตสถานะ
    task.status = status;
    await task.save(); // <-- ตอนนี้จะ save ผ่านแล้ว


    // ดึงข้อมูล user มาแนบด้วย
    const user = await User.findOne({ username: updatedTask.username }).select('firstName lastName phone');
    const taskWithUserData = {
      ...updatedTask.toObject(),
      userInfo: user
    };

    res.status(200).json({
      message: 'อัปเดตสถานะงานเรียบร้อยแล้ว',
      task: taskWithUserData
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะงาน',
      error: error.message
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



