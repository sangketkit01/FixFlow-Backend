import PaymentDetail from "../models/PaymentDetail.js";

// ดึงายได้จาก payment_details
export const getRevenueStats = async (req, res) => {
    try {
        const totalRevenueResult = await PaymentDetail.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: "$price" }
                }
            }
        ]);

        // จำนวนรายการชำระเงินทั้งหมด
        const totalPaymentsCount = await PaymentDetail.countDocuments();

        const totalRevenue = totalRevenueResult[0]?.total || 0;

        res.json({
            success: true,
            data: {
                total_revenue: totalRevenue,
                total_payments: totalPaymentsCount
            }
        });

    } catch (error) {
        console.error('Error fetching revenue stats:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
};