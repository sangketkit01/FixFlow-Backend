import Task from "../models/Task.js";

export const getDashboardStats = async (req, res) => {
    try {
        const statsPipeline = await Task.aggregate([
            {
                $group: {
                    _id: "$status", 
                    count: { $sum: 1 } 
                }
            },
            {
                $project: {
                    _id: 0,
                    status: "$_id",
                    count: 1
                }
            }
        ]);

        const statMap = statsPipeline.reduce((acc, item) => {
            acc[item.status] = item.count;
            return acc;
        }, {});
        
        const totalJobs = statsPipeline.reduce((sum, item) => sum + item.count, 0);
        
        const ongoing = (statMap.fixing || 0) + (statMap.accepted || 0);
        
        const cancelled = (statMap.cancelled || 0) + (statMap.request_canceling || 0);


        res.status(200).json({
            // ส่งผลลัพธ์กลับ
            total: totalJobs,
            fixing: statMap.fixing || 0,
            successful: statMap.successful || 0,
            failed: statMap.failed || 0,
            pending: statMap.pending || 0,
            // ส่งสถานะที่คำนวณเพิ่มเข้ามา
            ongoing: ongoing, 
            cancelled: cancelled,
            
        });

    } catch (err) {
   
        console.error("Error in getDashboardStats:", err);
        res.status(500).json({ message: "Failed to retrieve dashboard statistics.", error: err.message });
    }
};