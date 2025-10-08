import Payment from "../models/Payment.js";
import PaymentDetail from "../models/PaymentDetail.js";
import Task from "../models/Task.js";

// สร้าง / อัปเดต Payment (ถ้ายังไม่มี)
export const upsertPayment = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { type, amount } = req.body;

        let payment = await Payment.findOne({ task_id: taskId });
        if (!payment) {
            payment = new Payment({
                task_id: taskId,
                type: type || "other",
                amount: amount || 0,
                status: "pending",
            });
        } else {
            payment.amount = amount;
            payment.type = type || payment.type;
        }

        await payment.save();
        res.status(200).json({ message: "บันทึกค่าใช้จ่ายสำเร็จ", payment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
    }
};

// เพิ่มรายการย่อย (Payment Detail)
export const addPaymentDetail = async (req, res) => {
    try {
        const { payment_id, detail, price } = req.body;
        const newDetail = new PaymentDetail({ payment_id, detail, price });
        await newDetail.save();
        res.status(201).json({ message: "เพิ่มรายการสำเร็จ", paymentDetail: newDetail });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "เกิดข้อผิดพลาด" });
    }
};

// ลบรายการ
export const deletePaymentDetail = async (req, res) => {
    try {
        const { id } = req.params;
        await PaymentDetail.findByIdAndDelete(id);
        res.status(200).json({ message: "ลบรายการสำเร็จ" });
    } catch (err) {
        res.status(500).json({ message: "ลบไม่สำเร็จ" });
    }
};

// ดึงทั้งหมดของงาน
export const getPaymentDetails = async (req, res) => {
    try {
        const { taskId } = req.params;
        const payment = await Payment.findOne({ task_id: taskId });
        if (!payment)
            return res.status(404).json({ message: "ยังไม่มีการเพิ่มค่าใช้จ่าย" });

        const details = await PaymentDetail.find({ payment_id: payment._id });
        res.status(200).json({ payment, details });
    } catch (err) {
        res.status(500).json({ message: "ดึงข้อมูลไม่สำเร็จ" });
    }
};

export const getPaymentInfo = async (req, res) => {
    try {
        const { taskId } = req.params;

        const payment = await Payment.findOne({ task_id: taskId });
        if (!payment) return res.status(404).json({ message: "ยังไม่มีข้อมูลการชำระเงิน" });

        const details = await PaymentDetail.find({ payment_id: payment._id });

        res.status(200).json({ payment, details });
    } catch (err) {
        console.error("getPaymentInfo error:", err);
        res.status(500).json({ message: "เกิดข้อผิดพลาดภายในระบบ" });
    }
};

export const confirmPayment = async (req, res) => {
    try {
        const { taskId } = req.params;

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: "ไม่พบงานที่เกี่ยวข้อง" });

        const payment = await Payment.findOne({ task_id: taskId });
        if (!payment) return res.status(404).json({ message: "ไม่พบข้อมูลการชำระเงิน" });


        payment.status = "successful";
        await payment.save();

        task.status = "successful";
        await task.save();

        res.status(200).json({ message: "ยืนยันการชำระเงินสำเร็จ", payment });
    } catch (err) {
        console.error("confirmPayment error:", err);
        res.status(500).json({ message: "เกิดข้อผิดพลาดภายในระบบ" });
    }
};

