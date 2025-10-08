import Technician from "../models/Technician.js";
import Task from "../models/Task.js";

// ✅ ดึงข้อมูลช่างทั้งหมดพร้อมสถิติงาน
export const getAllTechnicians = async (req, res) => {
  try {
    const techs = await Technician.find();

    const data = await Promise.all(
      techs.map(async (tech) => {
        const totalTasks = await Task.countDocuments({ technician_id: tech._id });
        const fixingTasks = await Task.countDocuments({ technician_id: tech._id, status: "fixing" });
        const successfulTasks = await Task.countDocuments({ technician_id: tech._id, status: "successful" });
        const failedTasks = await Task.countDocuments({ technician_id: tech._id, status: "failed" });

        return {
          ...tech._doc,
          totalTasks,
          fixingTasks,
          successfulTasks,
          failedTasks,
        };
      })
    );

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ ดึงข้อมูลรายช่าง
export const getTechnicianById = async (req, res) => {
  try {
    const tech = await Technician.findById(req.params.id);
    if (!tech) return res.status(404).json({ message: "Technician not found" });
    res.status(200).json(tech);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ แก้ไขข้อมูลช่าง
export const updateTechnician = async (req, res) => {
  try {
    const updated = await Technician.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ ลบข้อมูลช่าง
export const deleteTechnician = async (req, res) => {
  try {
    await Technician.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Technician deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
