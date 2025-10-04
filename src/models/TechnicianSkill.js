import mongoose from "mongoose";

const technicianSkillSchema = new mongoose.Schema({
    technician_id: { type: String, ref: "technicians", required: true },
    technician_type_id: { type: mongoose.Schema.Types.ObjectId, ref: "technician_types", required: true },
    index: { type: Number, required: true }
}, {
    timestamps: true
})

const TechnicianSkill = mongoose.model("technician_skills", technicianSkillSchema)

export default TechnicianSkill;