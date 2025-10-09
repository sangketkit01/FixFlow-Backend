import Task from "../models/Task.js"


export const UserOwnerTaskMiddleware = async (req, res, next) => {
    try {
        const username = req.user.username
        const taskId = req.params.id;

        const task = await Task.find({ username: username, _id: taskId })
        if (!task) {
            return res.status(403).json({ message: "Forbidden: Not the owner of the task" })
        }
        next();
    } catch (err) {
        console.error("Error in UserOwnerTaskMiddleware:", err);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
    }
}

