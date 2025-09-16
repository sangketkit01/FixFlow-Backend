import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
    refresh_token: { type: String, required: true },
    invoked: { type: Boolean, default: false },
    issued_date: { type: Date, required: true },
    expires_date: { type: Date, required: true }
}, {
    timestamps: true
})

const Session = mongoose.model("sessions", sessionSchema)

export default Session;