import mongoose from "mongoose";

const technicianRegistrationSchema = new mongoose.Schema({
    full_name: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true, minlength: 10, maxlength: 10 },
    age: { type: Number, required: true, min: 0, max: 70 },
    id_card: { type: String, required: true, unique: true, minlength: 13, maxlength: 13 },
    id_card_image_path: { type: String, required: true },
    address: { type: String, required: true },
    district: { type: String, required: true },
    province: { type: String, required: true },
    birth_data: { type: Date, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"] },
}, {
    timestamps: true
})

const TechnicianRegistration = mongoose.model("technicians_registration", technicianRegistrationSchema)

export default TechnicianRegistration;