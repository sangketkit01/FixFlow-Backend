import { validationResult } from "express-validator";
import fs from "fs";
import TechnicianRegistration from "../models/TechnicianRegistration.js";

export const TechnicianRegister = async (req, res) => {
    try {
        // ✅ เช็ค validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            full_name,
            email,
            phone,
            age,
            id_card,
            address,
            district,
            province,
            birth_date,
        } = req.body;

        // ✅ เช็คซ้ำ email
        const exist = await TechnicianRegistration.findOne({ email });
        if (exist) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: "Email already registered" });
        }

        // ✅ เตรียมข้อมูลไฟล์
        let id_card_image = null;
        let id_card_image_path = null;

        if (req.file) {
            id_card_image = req.file.filename; // ชื่อไฟล์
            id_card_image_path = req.file.path; // path เต็มจาก multer
        }

        // ✅ insert DB
        const newTechnician = new TechnicianRegistration({
            full_name,
            email,
            phone,
            age,
            id_card,
            address,
            district,
            province,
            birth_date,
            id_card_image,
            id_card_image_path,
        });

        await newTechnician.save();

        return res.status(201).json({
            message: "Technician registered successfully",
            technician: {
                id: newTechnician._id,
                full_name: newTechnician.full_name,
                email: newTechnician.email,
                phone: newTechnician.phone,
                id_card: newTechnician.id_card,
                id_card_image: newTechnician.id_card_image,
                id_card_image_path: newTechnician.id_card_image_path,
            },
        });
    } catch (err) {
        console.error("TechnicianRegister error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
