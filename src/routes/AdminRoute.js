import express from "express"
import { authAdmin } from "../middleware/AdminMiddleware.js";
import Admin from "../models/Admin.js";
import { LoginAdmin } from "../controller/IndexController.js";

const adminRouter = express.Router()

adminRouter.get("/me", authAdmin, async (req, res) => {
    try {
        const user = await Admin.findOne({ username: req.admin.username }).select("-password");
        if (!user) return res.status(404).json({ message: "ADmin not found" });
        res.json({ "role": "admin" });
    } catch (err) {
        console.error("Admin /me error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

adminRouter.post("/login", LoginAdmin)

export default adminRouter;