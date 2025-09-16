import mongoose from "mongoose";

const technicianTypeSchema = new mongoose.Schema({
    name: { type: String, required: true }
}, {
    timestamps: true
})

const TechnicianType = mongoose.model("technician_types", technicianTypeSchema)

export default TechnicianType;