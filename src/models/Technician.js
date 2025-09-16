import mongoose from "mongoose";

const technicianSchema = new mongoose.Schema({
    username: { type: String, required: true, ref: "User" },
    full_name: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true, minlength: 10, maxlength: 10 },
    age: { type: Number, required: true, min: 0, max: 70 },
    password: { type: String, required: true },
    profile_path: { type: String },
    id_card: { type: String, required: true, unique: true, minlength: 13, maxlength: 13 },
    id_card_image_path: { type: String, required: true },
    address: { type: String, required: true },
    district: { type: String, required: true },
    province: { type: String, required: true },
    working_area_district: { type: String },
    working_area_province: { type: String },
    birth_data: { type: Date, required: true }
}, {
    timestamps: true
})

const Technician = mongoose.model("technicians", technicianSchema)

export default Technician;