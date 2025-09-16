import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
    username: { type: String, ref: "users", required: true },
    technician_id: { type: mongoose.Schema.Types.ObjectId, ref: "technicians", requiredd: true },
    title: { type: String, required: true },
    detail: { type: String },
    address: { type: String, required: true },
    district: { type: String, required: true },
    province: { type: String, required: true },
    status: { type: String, enum: ["pending", "fixing", "successful", "failed"], default: "pending" },
}, {
    timestamps: true
})

const Task = mongoose.model("tasks", taskSchema)

export default Task;