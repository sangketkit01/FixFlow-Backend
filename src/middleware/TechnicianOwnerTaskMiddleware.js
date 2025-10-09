import Task from "../models/Task.js";

const TechnicianOwnerTaskMiddleware = (req, res, next) => {
    try {
        const technicianUsername = req.technician.username;
        const taskId = req.params.id;

        const task = Task.findOne({ _id: taskId, technician_id: technicianUsername });
        if (!task) {
            return res.status(403).json({ message: "Forbidden: Not the assigned technician for this task" });
        }
        next();
    } catch (err) {
        console.error("Error in TechnicianOwnerTaskMiddleware:", err);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
    }
};

export default TechnicianOwnerTaskMiddleware;