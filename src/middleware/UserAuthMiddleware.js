
import jwt from "jsonwebtoken";
import ms from "ms";
import dotenv from "dotenv";
import Session from "../models/Session.js";
import { generateAccessToken } from "../utils/jwt.js";

dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET;
const ACCESS_TOKEN_DURATION = process.env.ACCESS_TOKEN_DURATION || "15m";

export const authUser = async (req, res, next) => {
    try {
        const { access_token, refresh_token } = req.cookies;

        if (!access_token) {
            return res.status(401).json({ message: "No access token provided" });
        }

        try {
            const decoded = jwt.verify(access_token, SECRET_KEY);

            if (decoded.role !== "user") {
                return res.status(403).json({ message: "Forbidden: User role required" });
            }

            req.user = decoded;
            return next();
        } catch (err) {

            if (err.name !== "TokenExpiredError") {
                return res.status(401).json({ message: "Invalid access token" });
            }
        }

        if (!refresh_token) {
            return res.status(401).json({ message: "No refresh token provided" });
        }

        const session = await Session.findOne({ refresh_token });
        if (!session) {
            return res.status(401).json({ message: "Refresh token not found" });
        }

        if (session.invoked === true || new Date() > session.expires_date) {
            return res.status(401).json({ message: "Refresh token invalid or expired" });
        }

        let decodedRefresh;
        try {
            decodedRefresh = jwt.verify(refresh_token, SECRET_KEY);
        } catch {
            return res.status(401).json({ message: "Invalid refresh token" });
        }

        if (decodedRefresh.role !== "user") {
            return res.status(403).json({ message: "Forbidden: User role required" });
        }

        const newAccessToken = generateAccessToken(decodedRefresh.username, decodedRefresh.role);

        res.cookie("access_token", newAccessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
            maxAge: ms(ACCESS_TOKEN_DURATION)
        });

        session.expires_date = new Date(Date.now() + ms(process.env.REFRESH_TOKEN_DURATION || "7d"));
        await session.save();

        req.user = decodedRefresh;
        next();
    } catch (err) {
        console.error("User auth middleware error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
