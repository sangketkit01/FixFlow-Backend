import TaskType from "../models/TaskType.js";

export const getAllTaskTypes = async (req, res) => {
    try {
        const types = await TaskType.find().sort({ name: 1 });
        res.json(types);
    } catch (err) {
        console.error("โหลดประเภทเครื่องใช้ไฟฟ้าไม่สำเร็จ:", err);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
    }
};
