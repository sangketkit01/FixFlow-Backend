import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
    task_id: { type: mongoose.Schema.Types.ObjectId, ref: "tasks", required: true, unique: true },
    type: { type: String, enum: ["transfer", "other"], required: true },
    slip_image_path: { type: String },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "refused", "successful"] }
}, {
    timestamps: true
})

const Payment = mongoose.model("payments", paymentSchema)

export default Payment;