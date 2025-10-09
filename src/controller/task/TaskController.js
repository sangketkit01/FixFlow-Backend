import Task from "../../models/Task.js";
import mongoose from "mongoose";
import path from "path";
import Payment from "../../models/Payment.js";
import PaymentDetail from "../../models/PaymentDetail.js";
import TaskImage from "../../models/TaskImage.js";
import Technician from "../../models/Technician.js";
import fs from "fs";
import TaskType from "../../models/TaskType.js";

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
            status: { $in: ["pending", "accepted", "fixing", "cancelled", "payment"] },
        })
            .populate("task_type_id", "name")
            .sort({ createdAt: -1 });

        const results = await Promise.all(
            tasks.map(async (task) => {
                const technician = task.technician_id
                    ? await Technician.findOne(
                        { username: task.technician_id },
                        "full_name phone email"
                    )
                    : null;

                return {
                    ...task.toObject(),
                    technician,
                };
            })
        );

        res.status(200).json(results);
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
            .sort({ updatedAt: -1 });

        const results = await Promise.all(
            tasks.map(async (task) => {
                const technician = await Technician.findOne(
                    { username: task.technician_id },
                    "full_name phone email"
                );

                const payment = await Payment.findOne({ task_id: task._id });
                const paymentDetails = payment
                    ? await PaymentDetail.find({ payment_id: payment._id })
                    : [];
                const taskImages = await TaskImage.find({ task_id: task._id });

                return {
                    ...task.toObject(),
                    technician: technician || null,
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

export const uploadTaskImage = async (req, res) => {
    try {
        const technician = req.technician;
        const { task_id, description } = req.body;

        if (!task_id) {
            return res.status(400).json({ message: "ต้องระบุ task_id" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "กรุณาเลือกไฟล์รูปภาพ" });
        }

        const task = await Task.findById(task_id);
        if (!task) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: "ไม่พบน งานที่ระบุ" });
        }

        if (task.technician_id !== technician.username) {
            fs.unlinkSync(req.file.path);
            return res.status(403).json({ message: "คุณไม่มีสิทธิ์อัปโหลดรูปสำหรับงานนี้" });
        }

        // ✅ ดึงชื่อไฟล์อย่างเดียว แล้ว prefix ด้วย /images/
        const fileName = path.basename(req.file.path);
        const imagePath = `/images/${fileName}`;

        const newImage = await TaskImage.create({
            task_id,
            image_path: imagePath,
            added_by: "technician",
            description: description || "",
        });

        res.status(201).json(newImage);
    } catch (err) {
        console.error("Upload task image error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    }
};

export const requestCancelTask = async (req, res) => {
    try {
        const { taskId } = req.params;

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: "ไม่พบนงาน" });

        if (task.status !== "fixing")
            return res.status(400).json({ message: "ไม่สามารถยกเลิกงานที่ไม่อยู่ระหว่างการซ่อมได้" });

        task.status = "request_canceling";
        await task.save();

        res.status(200).json({ message: "ส่งคำขอยกเลิกสำเร็จ", task });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};
export const getUserTaskDetail = async (req, res) => {
    try {
        const { taskId } = req.params;

        // ✅ ดึงข้อมูลงานจาก task_id
        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: "ไม่พบข้อมูลงานนี้" });

        const taskType = await TaskType.findById(task.task_type_id);

        // ✅ ดึงรูปภาพทั้งหมดที่เกี่ยวข้อง
        const images = await TaskImage.find({ task_id: taskId }).sort({ createdAt: -1 });

        // ✅ ดึงข้อมูลการชำระเงิน (payment + payment details)
        const payment = await Payment.findOne({ task_id: taskId });
        let paymentDetails = [];

        if (payment) {
            paymentDetails = await PaymentDetail.find({ payment_id: payment._id }).sort({ createdAt: -1 });
        }

        // ✅ ส่งข้อมูลทั้งหมดกลับ
        return res.json({
            task,
            images,
            payment,
            paymentDetails,
            taskType
        });

    } catch (err) {
        console.error("❌ getUserTaskDetail error:", err);
        res.status(500).json({ message: "ไม่สามารถโหลดข้อมูลงานได้" });
    }
};

// ========================================
// ✅ 2. อัปโหลดสลิปการชำระเงิน
// ========================================
export const uploadSlip = async (req, res) => {
    try {
        const { taskId } = req.params;

        const task = await Task.findOne({ _id: taskId });
        if (!task) return res.status(404).json({ message: "ไม่พบงานนี้ในระบบ" });

        // หา payment ที่ผูกกับ task นี้
        const payment = await Payment.findOne({ task_id: taskId });
        if (!payment) return res.status(404).json({ message: "ไม่พบข้อมูลการชำระเงิน" });

        if (task.status !== "payment")
            return res.status(400).json({ message: "ยังไม่สามารถแนบสลิปได้" });

        if (!req.file) return res.status(400).json({ message: "กรุณาแนบไฟล์สลิป" });

        // เก็บ path รูป
        const slipPath = `/images/payments/slips/${req.file.filename}`;

        // ลบไฟล์เก่าถ้ามี
        if (payment.slip_image_path) {
            const oldFile = path.join("uploads", "slips", path.basename(payment.slip_image_path));
            if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
        }

        // อัปเดต slip ใน payment เดิม
        payment.slip_image_path = slipPath;
        payment.status = "pending";
        await payment.save();

        res.json({ message: "อัปโหลดสลิปสำเร็จ", payment });
    } catch (err) {
        console.error("❌ uploadSlip error:", err);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการอัปโหลดสลิป" });
    }
};

// ========================================
// ✅ 3. ลบสลิปที่เคยส่ง
// ========================================
export const deleteSlip = async (req, res) => {
    try {
        const { taskId } = req.params;

        const task = await Task.findOne({ _id: taskId });
        if (!task) return res.status(404).json({ message: "ไม่พบงานนี้ในระบบ" });

        const payment = await Payment.findOne({ task_id: taskId });
        if (!payment) return res.status(404).json({ message: "ไม่พบข้อมูลการชำระเงิน" });

        if (!payment.slip_image_path)
            return res.status(400).json({ message: "ยังไม่มีสลิปให้ลบ" });

        // ลบไฟล์จริงออกจากเครื่อง
        const filePath = path.join("uploads", "slips", path.basename(payment.slip_image_path));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        // clear field ใน db
        payment.slip_image_path = null;
        payment.status = "pending";
        await payment.save();

        res.json({ message: "ลบสลิปสำเร็จ" });
    } catch (err) {
        console.error("❌ deleteSlip error:", err);
        res.status(500).json({ message: "ไม่สามารถลบสลิปได้" });
    }
};


