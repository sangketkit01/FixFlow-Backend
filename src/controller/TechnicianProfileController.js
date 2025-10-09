import Technician from "../models/Technician.js";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// ดึงข้อมูลโปรไฟล์ช่าง
export const getTechnicianProfile = async (req, res) => {
    try {
        const technician = await Technician.findOne({ username: req.technician.username }).select("-password");
        if (!technician) return res.status(404).json({ message: "ไม่พบข้อมูลช่าง" });
        res.json({ technician });
    } catch (err) {
        console.error("getTechnicianProfile error:", err);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
    }
};

// อัปเดตข้อมูลช่าง
export const updateTechnicianProfile = async (req, res) => {
    try {
        const { username } = req.technician;
        const { full_name, email, phone, age, id_card, address, district, province, birth_date } = req.body;

        const technician = await Technician.findOne({ username });
        if (!technician) return res.status(404).json({ message: "ไม่พบข้อมูลช่าง" });

        const updateData = {
            full_name, email, phone, age, id_card, address, district, province, birth_date
        };

        if (req.file) {
            const newProfilePath = path.posix.join("profiles", req.file.filename);

            // ลบรูปเก่า
            if (technician.profile_path && fs.existsSync(`public/${technician.profile_path}`)) {
                fs.unlinkSync(`public/${technician.profile_path}`);
            }

            updateData.profile_path = `/images/technicians/profile/${req.file.filename}`;
        }

        const updatedTechnician = await Technician.findOneAndUpdate(
            { username },
            updateData,
            { new: true, runValidators: true }
        ).select("-password");

        res.json({ message: "อัปเดตข้อมูลสำเร็จ", technician: updatedTechnician });
    } catch (err) {
        console.error("updateTechnicianProfile error:", err);
        if (err.code === 11000) {
            const field = Object.keys(err.keyValue)[0];
            return res.status(400).json({ message: `ข้อมูล ${field} ถูกใช้ไปแล้ว` });
        }
        res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
    }
};

// เปลี่ยนรหัสผ่านช่าง
export const changeTechnicianPassword = async (req, res) => {
    try {
        const { username } = req.technician;
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword)
            return res.status(400).json({ message: "กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่" });

        const technician = await Technician.findOne({ username });
        if (!technician)
            return res.status(404).json({ message: "ไม่พบข้อมูลช่าง" });

        const isMatch = await bcrypt.compare(oldPassword, technician.password);
        if (!isMatch)
            return res.status(400).json({ message: "รหัสผ่านเดิมไม่ถูกต้อง" });

        const salt = await bcrypt.genSalt(10);
        technician.password = await bcrypt.hash(newPassword, salt);
        await technician.save();

        res.json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
    } catch (err) {
        console.error("changeTechnicianPassword error:", err);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
    }
};
