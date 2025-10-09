import express from "express";
import { authAdmin } from "../middleware/AdminMiddleware.js";
import Admin from "../models/Admin.js";
import Technician from "../models/Technician.js";
import TechnicianRegistration from "../models/TechnicianRegistration.js";
import Task from "../models/Task.js";
import { LoginAdmin } from "../controller/IndexController.js";

const adminRouter = express.Router();

adminRouter.post("/login", LoginAdmin);

adminRouter.get("/me", authAdmin, async (req, res) => {
  try {
    const user = await Admin.findOne({ username: req.admin.username }).select(
      "-password"
    );
    if (!user) return res.status(404).json({ message: "Admin not found" });
    res.json({ role: "admin" });
  } catch (err) {
    console.error("Admin /me error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

adminRouter.get("/stats/dashboard", authAdmin, async (req, res) => {
  try {
    const stats = await Task.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const statMap = stats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const totalJobs = stats.reduce((sum, item) => sum + item.count, 0);
    const ongoing = (statMap.fixing || 0) + (statMap.accepted || 0);
    const cancelled =
      (statMap.cancelled || 0) + (statMap.request_canceling || 0);

    res.status(200).json({
      total: totalJobs,
      successful: statMap.successful || 0,
      fixing: statMap.fixing || 0,
      pending: statMap.pending || 0,
      failed: statMap.failed || 0,
      ongoing: ongoing,
      cancelled: cancelled,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res
      .status(500)
      .json({ message: "Failed to retrieve dashboard statistics" });
  }
});

adminRouter.get("/technicians-all", authAdmin, async (req, res) => {
  try {
    const pendingRegistrations = await TechnicianRegistration.find().lean();
    const pendingWithType = pendingRegistrations.map((reg) => ({
      ...reg,
      type: "registration",
      status: reg.status || "pending",
      source: "registration",
    }));

    const approvedTechnicians = await Technician.find()
      .select("-password")
      .lean();
    const approvedWithType = approvedTechnicians.map((tech) => ({
      ...tech,
      type: "technician",
      status: "approved",
      source: "system",
    }));

    const allTechnicians = [...pendingWithType, ...approvedWithType];

    const techsWithStats = await Promise.all(
      allTechnicians.map(async (tech) => {
        if (tech.type === "technician") {
          const totalTasks = await Task.countDocuments({
            technician_id: tech._id.toString(),
          });
          const successfulTasks = await Task.countDocuments({
            technician_id: tech._id.toString(),
            status: "successful",
          });
          const fixingTasks = await Task.countDocuments({
            technician_id: tech._id.toString(),
            status: "fixing",
          });

          return {
            ...tech,
            total_tasks: totalTasks,
            successful_tasks: successfulTasks,
            fixing_tasks: fixingTasks,
          };
        } else {
          return {
            ...tech,
            total_tasks: 0,
            successful_tasks: 0,
            fixing_tasks: 0,
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

adminRouter.get("/technicians/:id", authAdmin, async (req, res) => {
  try {
    let tech = await Technician.findById(req.params.id).select("-password");
    let type = "technician";

    if (!tech) {
      tech = await TechnicianRegistration.findById(req.params.id);
      type = "registration";
    }

    if (!tech) return res.status(404).json({ message: "Technician not found" });

    let totalTasks = 0,
      successfulTasks = 0,
      fixingTasks = 0;

    if (type === "technician") {
      totalTasks = await Task.countDocuments({ technician_id: req.params.id });
      successfulTasks = await Task.countDocuments({
        technician_id: req.params.id,
        status: "successful",
      });
      fixingTasks = await Task.countDocuments({
        technician_id: req.params.id,
        status: "fixing",
      });
    }

    res.json({
      ...tech.toObject(),
      total_tasks: totalTasks,
      successful_tasks: successfulTasks,
      fixing_tasks: fixingTasks,
      type,
    });
  } catch (err) {
    console.error("Get technician error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});


adminRouter.post("/technicians", authAdmin, async (req, res) => {
  try {
    const data = {
      ...req.body,
      username: req.body.username || req.body.email.split("@")[0],
      password: req.body.password || "123456",
      id_card_image_path:
        req.body.id_card_image_path || "/images/default_id.png",
      birth_date: req.body.birth_date || new Date("2000-01-01"),
    };

    const newTech = new Technician(data);
    await newTech.save();

    res
      .status(201)
      .json({ message: "Technician created successfully", tech: newTech });
  } catch (err) {
    console.error("Create technician error:", err.message);
    res.status(400).json({ message: err.message });
  }
});

adminRouter.put("/technicians/:id", authAdmin, async (req, res) => {
  try {
    let updatedTech = await Technician.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select("-password");

    let collectionType = "technician";

    if (!updatedTech) {
      updatedTech = await TechnicianRegistration.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      collectionType = "registration";
    }

    if (!updatedTech)
      return res.status(404).json({ message: "Technician not found" });

    res.json({
      message: "Technician updated",
      tech: updatedTech,
      type: collectionType,
    });
  } catch (err) {
    console.error("Update technician error:", err);
    res.status(500).json({ message: "Error updating technician" });
  }
});


adminRouter.put("/technicians/status/:id", authAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const tech = await Technician.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!tech) return res.status(404).json({ message: "Technician not found" });

    res.json({ message: "Status updated", technician: tech });
  } catch (err) {
    console.error("Error updating technician status:", err);
    res.status(500).json({ message: "Server error" });
  }
});

adminRouter.delete("/technicians/:id", authAdmin, async (req, res) => {
  try {
    const deleted = await Technician.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Technician not found" });
    res.json({ message: "Technician deleted successfully" });
  } catch (err) {
    console.error("Delete technician error:", err);
    res.status(500).json({ message: "Error deleting technician" });
  }
});

adminRouter.post("/registrations/:id/approve", authAdmin, async (req, res) => {
  try {
    const registration = await TechnicianRegistration.findById(req.params.id);

    if (!registration) {
      return res.status(404).json({ message: "ไม่พบข้อมูลการสมัคร" });
    }

    // ตรวจสอบซ้ำในระบบ
    const existingTech = await Technician.findOne({
      $or: [
        { email: registration.email },
        { phone: registration.phone },
        { id_card: registration.id_card },
      ],
    });

    if (existingTech) {
      return res.status(400).json({
        message: "มีข้อมูลซ้ำในระบบ (อีเมล, เบอร์โทร, หรือบัตรประชาชน)",
      });
    }

    // เปลี่ยน status เป็น approved
    registration.status = "approved";
    await registration.save();

    // ส่ง response แค่ registration ที่อนุมัติแล้ว
    res.json({
      message: "อนุมัติช่างสำเร็จ",
      registration: registration,
    });
  } catch (error) {
    console.error("Error approving registration:", error);
    res.status(500).json({ message: "Server error" });
  }
});

adminRouter.put("/registrations/status/:id", authAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const registration = await TechnicianRegistration.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!registration) {
      return res.status(404).json({ message: "ไม่พบข้อมูลการสมัคร" });
    }

    res.json({
      message: "อัพเดทสถานะสำเร็จ",
      registration,
    });
  } catch (error) {
    console.error("Error updating registration status:", error);
    res.status(500).json({ message: "Server error" });
  }
});

adminRouter.delete("/registrations/:id", authAdmin, async (req, res) => {
  try {
    const registration = await TechnicianRegistration.findByIdAndDelete(
      req.params.id
    );

    if (!registration) {
      return res.status(404).json({ message: "ไม่พบข้อมูลการสมัคร" });
    }

    res.json({ message: "ลบข้อมูลการสมัครสำเร็จ" });
  } catch (error) {
    console.error("Error deleting registration:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default adminRouter;
