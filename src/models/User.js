import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: { type: String, requiredd: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true, minlength: 10, maxlength: 10 },
    gender: { type: String, enum: ["male", "female", "other"], default: "other" },
    profile_path: { type: String, required: false },
    password: { type: String, required: true }
}, {
    timestamps: true
})

userSchema.methods.comparePassword = async function (candidate) {
    return bcrypt.compare(candidate, this.password)
}

const User = mongoose.model("users", userSchema);

export default User;