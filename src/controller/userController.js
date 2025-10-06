
import User from "../models/User.js";
import path from "path";
import bcrypt from "bcryptjs";
import fs from "fs";
import Task from "../models/Task.js";
export const updateProfile = async (req, res) => {
    try {
        const username = req.user.username;
        const { name, email, phone, gender } = req.body;

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: "ไม่พบผู้ใช้" });
        }

        const updateData = { name, email, phone, gender };

        if (req.file) {
            const newProfilePath = path.posix.join("images/users/profile", req.file.filename);

            const oldFilePath = path.join("public", user.profile_path?.replace(/^images\//, ""));

            if (user.profile_path && fs.existsSync(oldFilePath)) {
                try {
                    fs.unlinkSync(oldFilePath);
                    console.log("Deleted old profile:", oldFilePath);
                } catch (unlinkErr) {
                    console.warn("Cannot delete old profile:", unlinkErr.message);
                }
            }

            updateData.profile_path = newProfilePath;
        }

        const updatedUser = await User.findOneAndUpdate({ username }, updateData, {
            new: true,
            runValidators: true,
        });

        res.json({
            message: "อัปเดตโปรไฟล์สำเร็จ",
            user: updatedUser,
        });
    } catch (err) {
        console.error(err);
        if (err.code === 11000) {
            const field = Object.keys(err.keyValue)[0];
            return res.status(400).json({ message: `ข้อมูล ${field} นี้ถูกใช้ไปแล้ว` });
        }
        res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
    }
};

export const changePassword = async (req, res) => {
    try {
        const username = req.user.username;
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: "กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่" });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: "ไม่พบผู้ใช้" });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "รหัสผ่านเดิมไม่ถูกต้อง" });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        await user.save();

        res.json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
    }
};

export const getUserDashboard = async (req, res) => {
    const username = req.user.username;

    const summary = {
        pending: await Task.countDocuments({ username, status: "pending" }),
        accepted: await Task.countDocuments({ username, status: "accepted" }),
        fixing: await Task.countDocuments({ username, status: "fixing" }),
        success: await Task.countDocuments({ username, status: "successful" }),
    };

    const recentTasks = await Task.find({ username })
        .populate("task_type_id")
        .sort({ createdAt: -1 })
        .limit(5);

    res.json({ summary, recentTasks });
};

