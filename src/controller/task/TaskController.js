import Task from "../../models/Task.js";
import mongoose from "mongoose";
import path from "path";
import Payment from "../../models/Payment.js";
import PaymentDetail from "../../models/PaymentDetail.js";
import TaskImage from "../../models/TaskImage.js";

export const getUnassignedTasks = async (req, res) => {
    try {
        // ✅ เพิ่ม await เพื่อให้โปรแกรมรอจนกว่าจะค้นหาข้อมูลเสร็จ
        const unassignedTasks = await Task.find({ technician_id: null })
            .populate("username", "firstName lastName phone")
            .sort({ createdAt: 'desc' });

        // ส่วนนี้จะทำงานหลังจากได้ข้อมูลมาแล้ว
        res.status(200).json(unassignedTasks);

    } catch (error) {
        console.error("Error fetching unassigned tasks:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดบนเซิร์ฟเวอร์" });
    }
};

export const createTask = async (req, res) => {
    try {
        const username = req.user.username;
        const { task_type_id, title, detail, address, district, province } = req.body;

        if (!task_type_id || !title || !address || !district || !province) {
            return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        }

        const imagePaths = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach((file) => {
                imagePaths.push(path.posix.join("images/tasks/images", file.filename));
            });
        }

        const task = new Task({
            username,
            technician_id: null,
            task_type_id: new mongoose.Types.ObjectId(task_type_id),
            title,
            detail,
            address,
            district,
            province,
            status: "pending",
            images: imagePaths,
        });

        await task.save();

        res.json({ message: "สร้างคำขอแจ้งซ่อมสำเร็จ", task });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
    }
};

export const getUserTasks = async (req, res) => {
    try {
        const username = req.user.username;

        const tasks = await Task.find({
            username: username,
            status: { $in: ["pending", "accepted", "fixing", "cancelled"] }
        })
            .populate("task_type_id", "name")
            .populate("technician_id", "name phone")
            .sort({ createdAt: -1 });

        res.json(tasks);
    } catch (err) {
        console.error("❌ Error fetching user tasks:", err);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
    }
};


export const getUserHistoryTasks = async (req, res) => {
    try {
        const username = req.user.username;


        const tasks = await Task.find({
            username,
            status: "successful",
        })
            .populate("task_type_id", "name")
            .populate("technician_id", "full_name phone")
            .sort({ updatedAt: -1 });

        const results = await Promise.all(
            tasks.map(async (task) => {
                const payment = await Payment.findOne({ task_id: task._id });
                const paymentDetails = payment
                    ? await PaymentDetail.find({ payment_id: payment._id })
                    : [];
                const taskImages = await TaskImage.find({ task_id: task._id });

                return {
                    ...task.toObject(),
                    payment,
                    paymentDetails,
                    taskImages,
                };
            })
        );

        res.status(200).json(results);
    } catch (err) {
        console.error("❌ Error fetching user history:", err);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
    }
};

