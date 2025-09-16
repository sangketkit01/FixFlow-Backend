import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY;
const ACCESS_TOKEN_DURATION = process.env.ACCESS_TOKEN_DURATION || "15m";
const REFRESH_TOKEN_DURATION = process.env.REFRESH_TOKEN_DURATION || "7d";

if (!SECRET_KEY || SECRET_KEY.length < 32) {
    throw new Error("SECRET_KEY must be at least 32 characters long");
}

export const generateAccessToken = (username, role) => {
    const now = Date.now();
    const payload = {
        username,
        role,
        issued_at: now,
        expires_at: now + ms(ACCESS_TOKEN_DURATION)
    };

    return jwt.sign(payload, SECRET_KEY, { expiresIn: ACCESS_TOKEN_DURATION });
};


export const generateRefreshToken = (username, role) => {
    const now = Date.now();
    const payload = {
        username,
        role,
        issued_at: now,
        expires_at: now + ms(REFRESH_TOKEN_DURATION)
    };

    return jwt.sign(payload, SECRET_KEY, { expiresIn: REFRESH_TOKEN_DURATION });
};

export const verifyToken = (token) => {
    try {
        return jwt.verify(token, SECRET_KEY);
    } catch (err) {
        return null;
    }
};

function ms(duration) {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) throw new Error("Invalid duration format in .env");

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
        case "s": return value * 1000;
        case "m": return value * 60 * 1000;
        case "h": return value * 60 * 60 * 1000;
        case "d": return value * 24 * 60 * 60 * 1000;
        default: throw new Error("Invalid duration unit");
    }
}
