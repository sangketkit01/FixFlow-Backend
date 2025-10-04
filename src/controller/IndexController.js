import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.js";
import ms from "ms"
import Session from "../models/Session.js";
import User from "../models/User.js"
import bcrypt from "bcryptjs";
import Technician from "../models/Technician.js";
import Admin from "../models/Admin.js";
import { validationResult } from "express-validator";

export const LoginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

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
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
}

export const LoginTechnician = async (req, res) => {
    const { username, password } = req.body;

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const technician = await Technician.findOne({ username })
        if (!technician) {
            return res.status(401).json({ "message": "Invalid username" })
        }

        const isMatch = await technician.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ "message": "Invalid password" })
        }

        const accessToken = generateAccessToken(technician.username, "technician")
        const refreshToken = generateRefreshToken(technician.username, "technician")

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


export const LoginAdmin = async (req, res) => {
    const { username, password } = req.body;

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const admin = await Admin.findOne({ username })
        if (!admin) {
            return res.status(401).json({ "message": "Invalid username" })
        }

        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ "message": "Invalid password" })
        }

        const accessToken = generateAccessToken(admin.username, "admin")
        const refreshToken = generateRefreshToken(admin.username, "admin")

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

export const RegisterUser = async (req, res) => {
    try {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, phone, password } = req.body;

        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (existingUser) {
            return res.status(400).json({ message: "Username or email already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username: username,
            name: username,
            email: email,
            phone: phone,
            password: hashedPassword,
            role: "user"
        });

        await newUser.save();

        const accessToken = generateAccessToken(newUser.username, "user")
        const refreshToken = generateRefreshToken(newUser.username, "user")

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


        res.status(200).json({
            message: "User registered successfully",
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                phone: newUser.phone,
                role: newUser.role
            }
        });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const registerTechnician = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        if (!req.file) {
            return res.status(400).json({ message: "id_card_image is required" });
        }


        const {
            full_name,
            email,
            phone,
            age,
            id_card,
            address,
            district,
            province,
            birth_date
        } = req.body;

        const exists = await Technician.findOne({ $or: [{ email }, { id_card }] });
        if (exists) {
            return res.status(400).json({ message: "Email or ID card already exists" });
        }

        const idCardImagePath = `/public/registration/id_card/${req.file.filename}`;

        const technician = await Technician.create({
            full_name,
            email,
            phone,
            age,
            id_card,
            address,
            district,
            province,
            birth_date,
            id_card_image: idCardImagePath
        });


        return res.status(201).json({
            message: "Technician registered successfully",
            technician
        });
    } catch (err) {
        console.error("Register Technician error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

export const Logout = async (req, res) => {
    const refreshToken = req.cookies.refresh_token;

    try {
        if (!refreshToken) {
            return res.status(400).json({ message: "Refresh token not found" });
        }
        await Session.findOneAndUpdate({ refresh_token: refreshToken }, { invoked: true });

        res.clearCookie("access_token");
        res.clearCookie("refresh_token");
        return res.json({ message: "Logout successful" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
}
