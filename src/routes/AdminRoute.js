import express from "express"
import { authAdmin } from "../middleware/AdminMiddleware.js";
import Admin from "../models/Admin.js";

const adminRouter = express.Router()

adminRouter.get("/me", authAdmin, async (req, res) => {
    try {
        const user = await Admin.findOne({ username: req.user.username }).select("-password");
        if (!user) return res.status(404).json({ message: "ADmin not found" });
        res.json({ "role": "admin" });
    } catch (err) {
        console.error("Admin /me error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

export default adminRouter;