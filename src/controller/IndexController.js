import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.js";
import ms from "ms"
import Session from "../models/Session.js";
import User from "../models/User.js"

export const LoginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username })
        if (!user) {
            return res.status(401).json({ "message": "Invalid username" })
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ "message": "Invalid password" })
        }

        const accessToken = generateAccessToken(user.username, "user")
        const refreshToken = generateRefreshToken(user.username, "user")

        const issuedDate = new Date();
        const expiresDate = new Date(issuedDate.getTime() + ms(process.env.REFRESH_TOKEN_DURATION || "7d"));

        await Session.create({
            refresh_token: refreshToken,
            issued_date: issuedDate,
            expires_date: expiresDate
        })

        res.cookie("access_token", accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
            maxAge: ms(process.env.ACCESS_TOKEN_DURATION || "15m")
        })

        res.cookie("refresh_token", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
            maxAge: ms(process.env.REFRESH_TOKEN_DURATION || "7d")
        })

        return res.json({ message: "Login successful" });
    } catch (error) {
        onsole.error(err);
        return res.status(500).json({ message: "Server error" });
    }
}