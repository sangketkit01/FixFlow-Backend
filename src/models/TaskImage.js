import mongoose from "mongoose";

const taskImageSchema = new mongoose.Schema({
    task_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    image_path: { type: String, required: true },
    added_by: { type: String, enum: ["user", "technician"], required: true },
    created_at: { type: Date, default: Date.now },
    description: { type: String }
})

const TaskImage = mongoose.model("task_images", taskImageSchema)

export default TaskImage;