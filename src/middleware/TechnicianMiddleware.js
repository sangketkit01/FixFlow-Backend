import jwt from "jsonwebtoken";
import ms from "ms";
import dotenv from "dotenv";
import Session from "../models/Session.js";
import { generateAccessToken } from "../../utils/jwt.js";

dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY;
const ACCESS_TOKEN_DURATION = process.env.ACCESS_TOKEN_DURATION || "15m";
const REFRESH_TOKEN_DURATION = process.env.REFRESH_TOKEN_DURATION || "7d";

export const authTechnician = async (req, res, next) => {
    try {
        const { access_token, refresh_token } = req.cookies;

        let decodedAccess = null;

        if (access_token) {
            try {
                decodedAccess = jwt.verify(access_token, SECRET_KEY);

                if (decodedAccess.role !== "technician") {
                    return res.status(403).json({ message: "Forbidden: Technician role required" });
                }

                req.technician = decodedAccess;
                return next();
            } catch (err) {
                if (err.name !== "TokenExpiredError") {
                    console.log("Invalid access token");
                    return res.status(401).json({ message: "Invalid access token" });
                }
                console.log("Access token expired");
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

        if (decodedRefresh.role !== "technician") {
            return res.status(403).json({ message: "Forbidden: Technician role required" });
        }

        const newAccessToken = generateAccessToken(decodedRefresh.username, decodedRefresh.role);

        res.cookie("access_token", newAccessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
            maxAge: ms(ACCESS_TOKEN_DURATION)
        });

        session.expires_date = new Date(Date.now() + ms(REFRESH_TOKEN_DURATION));
        await session.save();

        req.technician = decodedRefresh;
        return next();
    } catch (err) {
        console.error("Technician auth middleware error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
