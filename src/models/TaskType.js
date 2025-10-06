import mongoose from "mongoose";

const taskTypeSchema = new mongoose.Schema({
    name: { type: String, require: true }
})

const TaskType = mongoose.model("task_types", taskTypeSchema)

export default TaskType