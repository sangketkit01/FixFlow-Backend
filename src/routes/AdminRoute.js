// adminRoute.js
import express from "express"
import { authAdmin } from "../middleware/AdminMiddleware.js";
import Admin from "../models/Admin.js";
import Technician from "../models/Technician.js";
import TechnicianRegistration from "../models/TechnicianRegistration.js";
import Task from "../models/Task.js";
import { LoginAdmin } from "../controller/IndexController.js"; 

const adminRouter = express.Router()

// =============================================
// AUTHENTICATION ROUTES
// =============================================
adminRouter.post("/login", LoginAdmin)

adminRouter.get("/me", authAdmin, async (req, res) => {
    try {
        const user = await Admin.findOne({ username: req.admin.username }).select("-password");
        if (!user) return res.status(404).json({ message: "Admin not found" });
        res.json({ "role": "admin" });
    } catch (err) {
        console.error("Admin /me error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// =============================================
// DASHBOARD & STATS ROUTES
// =============================================
adminRouter.get("/stats/dashboard", authAdmin, async (req, res) => {
    try {
        const stats = await Task.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const statMap = stats.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});
        
        const totalJobs = stats.reduce((sum, item) => sum + item.count, 0);
        const ongoing = (statMap.fixing || 0) + (statMap.accepted || 0);
        const cancelled = (statMap.cancelled || 0) + (statMap.request_canceling || 0);

        res.status(200).json({
            total: totalJobs,
            successful: statMap.successful || 0,
            fixing: statMap.fixing || 0,
            pending: statMap.pending || 0,
            failed: statMap.failed || 0,
            ongoing: ongoing,
            cancelled: cancelled
        });
    } catch (err) {
        console.error("Dashboard stats error:", err);
        res.status(500).json({ message: "Failed to retrieve dashboard statistics" });
    }
});

// =============================================
// TECHNICIANS MANAGEMENT ROUTES
// =============================================

// ✅ ดึงข้อมูลช่างทั้งหมด (ทั้ง technicians และ registrations) - ใช้แทน technicians เดิม
adminRouter.get("/technicians-all", authAdmin, async (req, res) => {
    try {
        // ดึงข้อมูลจาก technician_registrations (ช่างรอดำเนินการ) ก่อน
        const pendingRegistrations = await TechnicianRegistration.find().lean();
        const pendingWithType = pendingRegistrations.map(reg => ({
            ...reg,
            type: 'registration',
            status: reg.status || 'pending',
            source: 'registration'
        }));

        // ดึงข้อมูลจาก technicians (ช่างที่อนุมัติแล้ว) หลัง
        const approvedTechnicians = await Technician.find().select("-password").lean();
        const approvedWithType = approvedTechnicians.map(tech => ({
            ...tech,
            type: 'technician',
            status: 'approved',
            source: 'system'
        }));

        // รวมข้อมูลทั้งสองส่วน (registration มาก่อน)
        const allTechnicians = [...pendingWithType, ...approvedWithType];
        
        // ดึงสถิติงานสำหรับช่างที่อนุมัติแล้วเท่านั้น
        const techsWithStats = await Promise.all(
            allTechnicians.map(async (tech) => {
                if (tech.type === 'technician') {
                    const totalTasks = await Task.countDocuments({ technician_id: tech._id.toString() });
                    const successfulTasks = await Task.countDocuments({ 
                        technician_id: tech._id.toString(), 
                        status: "successful" 
                    });
                    const fixingTasks = await Task.countDocuments({ 
                        technician_id: tech._id.toString(), 
                        status: "fixing" 
                    });

                    return {
                        ...tech,
                        total_tasks: totalTasks,
                        successful_tasks: successfulTasks,
                        fixing_tasks: fixingTasks,
                        specialty: tech.specialty || "ช่างทั่วไป"
                    };
                } else {
                    // สำหรับ registration ไม่มีสถิติงาน
                    return {
                        ...tech,
                        total_tasks: 0,
                        successful_tasks: 0,
                        fixing_tasks: 0,
                        specialty: tech.specialty || "รอการอนุมัติ"
                    };
                }
            })
        );

        res.json(techsWithStats);
    } catch (err) {
        console.error("Get all technicians error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ✅ ดึงข้อมูลช่างตาม ID (รองรับทั้ง technician และ registration ที่ approved)
adminRouter.get("/technicians/:id", authAdmin, async (req, res) => {
    try {
        // ลองหาจาก technicians ก่อน
        let tech = await Technician.findById(req.params.id).select("-password");
        
        if (!tech) {
            // ถ้าไม่เจอใน technicians ให้หาจาก registrations
            tech = await TechnicianRegistration.findById(req.params.id);
        }

        if (!tech) {
            return res.status(404).json({ message: "Technician not found" });
        }

        // ดึงสถิติงานเฉพาะ technician เท่านั้น
        if (tech instanceof Technician) {
            const totalTasks = await Task.countDocuments({ technician_id: req.params.id });
            const successfulTasks = await Task.countDocuments({ 
                technician_id: req.params.id, 
                status: "successful" 
            });
            const fixingTasks = await Task.countDocuments({ 
                technician_id: req.params.id, 
                status: "fixing" 
            });

            const techWithStats = {
                ...tech.toObject(),
                total_tasks: totalTasks,
                successful_tasks: successfulTasks,
                fixing_tasks: fixingTasks,
                type: 'technician'
            };

            return res.json(techWithStats);
        } else {
            // สำหรับ registration
            const registrationWithType = {
                ...tech.toObject(),
                total_tasks: 0,
                successful_tasks: 0,
                fixing_tasks: 0,
                type: 'registration'
            };

            return res.json(registrationWithType);
        }
    } catch (err) {
        console.error("Get technician error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ✅ เพิ่มช่างใหม่
adminRouter.post("/technicians", authAdmin, async (req, res) => {
    try {
        const data = {
            ...req.body,
            username: req.body.username || req.body.email.split("@")[0],
            password: req.body.password || "123456",
            id_card_image_path: req.body.id_card_image_path || "/images/default_id.png",
            birth_date: req.body.birth_date || new Date("2000-01-01")
        };

        const newTech = new Technician(data);
        await newTech.save();

        res.status(201).json({ message: "Technician created successfully", tech: newTech });
    } catch (err) {
        console.error("Create technician error:", err.message);
        res.status(400).json({ message: err.message });
    }
});



// ✅ แก้ไขข้อมูลช่าง
adminRouter.put("/technicians/:id", authAdmin, async (req, res) => {
    try {
        const updatedTech = await Technician.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        ).select("-password");
        
        if (!updatedTech) return res.status(404).json({ message: "Technician not found" });
        res.json({ message: "Technician updated", tech: updatedTech });
    } catch (err) {
        console.error("Update technician error:", err);
        res.status(500).json({ message: "Error updating technician" });
    }
});

// ✅ อัพเดทสถานะช่าง
adminRouter.put("/technicians/status/:id", authAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const tech = await Technician.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!tech) return res.status(404).json({ message: 'Technician not found' });

        res.json({ message: 'Status updated', technician: tech });
    } catch (err) {
        console.error('Error updating technician status:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ✅ ลบช่าง
adminRouter.delete("/technicians/:id", authAdmin, async (req, res) => {
    try {
        const deleted = await Technician.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Technician not found" });
        res.json({ message: "Technician deleted successfully" });
    } catch (err) {
        console.error("Delete technician error:", err);
        res.status(500).json({ message: "Error deleting technician" });
    }
});

// =============================================
// REGISTRATION MANAGEMENT ROUTES
// =============================================

// ✅ อนุมัติการสมัครช่าง
adminRouter.post("/registrations/:id/approve", authAdmin, async (req, res) => {
    try {
        const registration = await TechnicianRegistration.findById(req.params.id);
        
        if (!registration) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลการสมัคร' });
        }

        // ตรวจสอบว่ามีข้อมูลซ้ำหรือไม่
        const existingTech = await Technician.findOne({
            $or: [
                { email: registration.email },
                { phone: registration.phone },
                { id_card: registration.id_card }
            ]
        });

        if (existingTech) {
            return res.status(400).json({ 
                message: 'มีข้อมูลซ้ำในระบบ (อีเมล, เบอร์โทร, หรือบัตรประชาชน)' 
            });
        }

        // สร้างช่างใหม่จากข้อมูลการสมัคร
        const newTechnician = new Technician({
            full_name: registration.full_name,
            email: registration.email,
            phone: registration.phone,
            age: registration.age,
            id_card: registration.id_card,
            id_card_image_path: registration.id_card_image_path,
            address: registration.address,
            district: registration.district,
            province: registration.province,
            birth_date: registration.birth_date,
            status: 'approved',
            specialty: "ช่างทั่วไป",
            created_from_registration: true
        });

        await newTechnician.save();
        
        // อัพเดทสถานะการสมัครเป็น approved
        registration.status = 'approved';
        await registration.save();

        res.json({ 
            message: 'อนุมัติช่างสำเร็จ', 
            technician: newTechnician 
        });
    } catch (error) {
        console.error('Error approving registration:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ✅ อัพเดทสถานะการสมัคร
adminRouter.put("/registrations/status/:id", authAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const registration = await TechnicianRegistration.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!registration) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลการสมัคร' });
        }

        res.json({ 
            message: 'อัพเดทสถานะสำเร็จ', 
            registration 
        });
    } catch (error) {
        console.error('Error updating registration status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ✅ ลบการสมัคร
adminRouter.delete("/registrations/:id", authAdmin, async (req, res) => {
    try {
        const registration = await TechnicianRegistration.findByIdAndDelete(req.params.id);
        
        if (!registration) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลการสมัคร' });
        }

        res.json({ message: 'ลบข้อมูลการสมัครสำเร็จ' });
    } catch (error) {
        console.error('Error deleting registration:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default adminRouter;

















































// // adminRoute.js
// import express from "express"
// import { authAdmin } from "../middleware/AdminMiddleware.js";
// import Admin from "../models/Admin.js";
// import Technician from "../models/Technician.js";
// import TechnicianRegistration from "../models/TechnicianRegistration.js"; // ✅ เพิ่ม import
// import Task from "../models/Task.js";
// import { LoginAdmin } from "../controller/IndexController.js"; 

// const adminRouter = express.Router()

// adminRouter.post("/login", LoginAdmin)

// adminRouter.get("/me", authAdmin, async (req, res) => {
//     try {
//         const user = await Admin.findOne({ username: req.admin.username }).select("-password");
//         if (!user) return res.status(404).json({ message: "Admin not found" });
//         res.json({ "role": "admin" });
//     } catch (err) {
//         console.error("Admin /me error:", err);
//         res.status(500).json({ message: "Server error" });
//     }
// });

// // ✅ ดึงสถิติแดชบอร์ด
// adminRouter.get("/stats/dashboard", authAdmin, async (req, res) => {
//     try {
//         const stats = await Task.aggregate([
//             {
//                 $group: {
//                     _id: "$status",
//                     count: { $sum: 1 }
//                 }
//             }
//         ]);

//         const statMap = stats.reduce((acc, item) => {
//             acc[item._id] = item.count;
//             return acc;
//         }, {});
        
//         const totalJobs = stats.reduce((sum, item) => sum + item.count, 0);
//         const ongoing = (statMap.fixing || 0) + (statMap.accepted || 0);
//         const cancelled = (statMap.cancelled || 0) + (statMap.request_canceling || 0);

//         res.status(200).json({
//             total: totalJobs,
//             successful: statMap.successful || 0,
//             fixing: statMap.fixing || 0,
//             pending: statMap.pending || 0,
//             failed: statMap.failed || 0,
//             ongoing: ongoing,
//             cancelled: cancelled
//         });
//     } catch (err) {
//         console.error("Dashboard stats error:", err);
//         res.status(500).json({ message: "Failed to retrieve dashboard statistics" });
//     }
// });

// // ✅ ดึงข้อมูลช่างทั้งหมด (ทั้ง technicians และ registrations)
// adminRouter.get("/technicians-all", authAdmin, async (req, res) => {
//     try {
//         // ดึงข้อมูลจาก technicians (ช่างที่อนุมัติแล้ว)
//         const approvedTechnicians = await Technician.find().select("-password").lean();
//         const approvedWithType = approvedTechnicians.map(tech => ({
//             ...tech,
//             type: 'technician',
//             status: 'approved', // กำหนดสถานะให้ชัดเจน
//             source: 'system'
//         }));

//         // ดึงข้อมูลจาก technician_registrations (ช่างรอดำเนินการ)
//         const pendingRegistrations = await TechnicianRegistration.find().lean();
//         const pendingWithType = pendingRegistrations.map(reg => ({
//             ...reg,
//             type: 'registration',
//             status: reg.status || 'pending', // ใช้ status จาก registration
//             source: 'registration'
//         }));

//         // รวมข้อมูลทั้งสองส่วน
//         const allTechnicians = [...pendingWithType, ...approvedWithType];
        
//         // ดึงสถิติงานสำหรับช่างที่อนุมัติแล้วเท่านั้น
//         const techsWithStats = await Promise.all(
//             allTechnicians.map(async (tech) => {
//                 if (tech.type === 'technician') {
//                     const totalTasks = await Task.countDocuments({ technician_id: tech._id.toString() });
//                     const successfulTasks = await Task.countDocuments({ 
//                         technician_id: tech._id.toString(), 
//                         status: "successful" 
//                     });
//                     const fixingTasks = await Task.countDocuments({ 
//                         technician_id: tech._id.toString(), 
//                         status: "fixing" 
//                     });

//                     return {
//                         ...tech,
//                         total_tasks: totalTasks,
//                         successful_tasks: successfulTasks,
//                         fixing_tasks: fixingTasks,
//                         specialty: tech.specialty || "ช่างทั่วไป"
//                     };
//                 } else {
//                     // สำหรับ registration ไม่มีสถิติงาน
//                     return {
//                         ...tech,
//                         total_tasks: 0,
//                         successful_tasks: 0,
//                         fixing_tasks: 0,
//                         specialty: "รอการอนุมัติ"
//                     };
//                 }
//             })
//         );

//         res.json(techsWithStats);
//     } catch (err) {
//         console.error("Get all technicians error:", err);
//         res.status(500).json({ message: "Server Error" });
//     }
// });

// // ✅ ดึงเฉพาะ technicians (เดิม)
// adminRouter.get("/technicians", authAdmin, async (req, res) => {
//     try {
//         const techs = await Technician.find().select("-password").lean();
        
//         const techsWithStats = await Promise.all(
//             techs.map(async (tech) => {
//                 const totalTasks = await Task.countDocuments({ technician_id: tech._id.toString() });
//                 const successfulTasks = await Task.countDocuments({ 
//                     technician_id: tech._id.toString(), 
//                     status: "successful" 
//                 });
//                 const fixingTasks = await Task.countDocuments({ 
//                     technician_id: tech._id.toString(), 
//                     status: "fixing" 
//                 });

//                 return {
//                     ...tech,
//                     total_tasks: totalTasks,
//                     successful_tasks: successfulTasks,
//                     fixing_tasks: fixingTasks,
//                     name: tech.full_name,
//                     specialty: tech.specialty || "ช่างทั่วไป"
//                 };
//             })
//         );

//         res.json(techsWithStats);
//     } catch (err) {
//         console.error("Get technicians error:", err);
//         res.status(500).json({ message: "Server Error" });
//     }
// });

// // ✅ อนุมัติการสมัครช่าง
// adminRouter.post("/registrations/:id/approve", authAdmin, async (req, res) => {
//     try {
//         const registration = await TechnicianRegistration.findById(req.params.id);
        
//         if (!registration) {
//             return res.status(404).json({ message: 'ไม่พบข้อมูลการสมัคร' });
//         }

//         // ตรวจสอบว่ามีข้อมูลซ้ำหรือไม่
//         const existingTech = await Technician.findOne({
//             $or: [
//                 { email: registration.email },
//                 { phone: registration.phone },
//                 { id_card: registration.id_card }
//             ]
//         });

//         if (existingTech) {
//             return res.status(400).json({ 
//                 message: 'มีข้อมูลซ้ำในระบบ (อีเมล, เบอร์โทร, หรือบัตรประชาชน)' 
//             });
//         }

//         // สร้างช่างใหม่จากข้อมูลการสมัคร
//         const newTechnician = new Technician({
//             full_name: registration.full_name,
//             email: registration.email,
//             phone: registration.phone,
//             age: registration.age,
//             id_card: registration.id_card,
//             id_card_image_path: registration.id_card_image_path,
//             address: registration.address,
//             district: registration.district,
//             province: registration.province,
//             birth_date: registration.birth_date,
//             status: 'approved',
//             specialty: "ช่างทั่วไป", // ตั้งค่า default
//             created_from_registration: true // หมายเหตุว่าสร้างจากการสมัคร
//         });

//         await newTechnician.save();
        
//         // อัพเดทสถานะการสมัครเป็น approved
//         registration.status = 'approved';
//         await registration.save();

//         res.json({ 
//             message: 'อนุมัติช่างสำเร็จ', 
//             technician: newTechnician 
//         });
//     } catch (error) {
//         console.error('Error approving registration:', error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });
// adminRouter.put("/technicians/status/:id", authAdmin, async (req, res) => {
//   try {
//     const { status } = req.body;
//     const tech = await Technician.findByIdAndUpdate(
//       req.params.id,
//       { status },
//       { new: true }
//     );

//     if (!tech) return res.status(404).json({ message: 'Technician not found' });

//     res.json({ message: 'Status updated', technician: tech });
//   } catch (err) {
//     console.error('Error updating technician status:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });



// // ✅ อัพเดทสถานะการสมัคร
// adminRouter.put("/registrations/status/:id", authAdmin, async (req, res) => {
//     try {
//         const { status } = req.body;
//         const registration = await TechnicianRegistration.findByIdAndUpdate(
//             req.params.id,
//             { status },
//             { new: true }
//         );

//         if (!registration) {
//             return res.status(404).json({ message: 'ไม่พบข้อมูลการสมัคร' });
//         }

//         res.json({ 
//             message: 'อัพเดทสถานะสำเร็จ', 
//             registration 
//         });
//     } catch (error) {
//         console.error('Error updating registration status:', error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// // ✅ ลบการสมัคร
// adminRouter.delete("/registrations/:id", authAdmin, async (req, res) => {
//     try {
//         const registration = await TechnicianRegistration.findByIdAndDelete(req.params.id);
        
//         if (!registration) {
//             return res.status(404).json({ message: 'ไม่พบข้อมูลการสมัคร' });
//         }

//         res.json({ message: 'ลบข้อมูลการสมัครสำเร็จ' });
//     } catch (error) {
//         console.error('Error deleting registration:', error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// // ✅ ดึงข้อมูลช่างตาม ID
// adminRouter.get("/technicians/:id", authAdmin, async (req, res) => {
//     try {
//         const tech = await Technician.findById(req.params.id).select("-password");
//         if (!tech) return res.status(404).json({ message: "Technician not found" });
        
//         const totalTasks = await Task.countDocuments({ technician_id: req.params.id });
//         const successfulTasks = await Task.countDocuments({ 
//             technician_id: req.params.id, 
//             status: "successful" 
//         });
//         const fixingTasks = await Task.countDocuments({ 
//             technician_id: req.params.id, 
//             status: "fixing" 
//         });

//         const techWithStats = {
//             ...tech.toObject(),
//             total_tasks: totalTasks,
//             successful_tasks: successfulTasks,
//             fixing_tasks: fixingTasks
//         };

//         res.json(techWithStats);
//     } catch (err) {
//         console.error("Get technician error:", err);
//         res.status(500).json({ message: "Server Error" });
//     }
// });

// // ✅ เพิ่มช่างใหม่
// adminRouter.post("/technicians", authAdmin, async (req, res) => {
//     try {
//         const newTech = new Technician(req.body);
//         await newTech.save();
//         res.status(201).json({ message: "Technician created successfully", tech: newTech });
//     } catch (err) {
//         console.error("Create technician error:", err);
//         res.status(400).json({ message: "Error creating technician" });
//     }
// });

// // ✅ แก้ไขข้อมูลช่าง
// adminRouter.put("/technicians/:id", authAdmin, async (req, res) => {
//     try {
//         const updatedTech = await Technician.findByIdAndUpdate(
//             req.params.id, 
//             req.body, 
//             { new: true, runValidators: true }
//         ).select("-password");
        
//         if (!updatedTech) return res.status(404).json({ message: "Technician not found" });
//         res.json({ message: "Technician updated", tech: updatedTech });
//     } catch (err) {
//         console.error("Update technician error:", err);
//         res.status(500).json({ message: "Error updating technician" });
//     }
// });

// // ✅ ลบช่าง
// adminRouter.delete("/technicians/:id", authAdmin, async (req, res) => {
//     try {
//         const deleted = await Technician.findByIdAndDelete(req.params.id);
//         if (!deleted) return res.status(404).json({ message: "Technician not found" });
//         res.json({ message: "Technician deleted successfully" });
//     } catch (err) {
//         console.error("Delete technician error:", err);
//         res.status(500).json({ message: "Error deleting technician" });
//     }
// });




// export default adminRouter;