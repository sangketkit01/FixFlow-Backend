import Task from "../../models/Task.js";

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
