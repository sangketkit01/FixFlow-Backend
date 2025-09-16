import mongoose from "mongoose";

const paymentDetailSchema = new mongoose.Schema({
    payment_id: { type: mongoose.Schema.Types.ObjectId, ref: "payments", required: true },
    detail: { type: String, required: true },
    price: { type: Number, required: true }
}, {
    timestamps: true
})

const PaymentDetail = mongoose.model("payment_details", paymentDetailSchema)

export default PaymentDetail;