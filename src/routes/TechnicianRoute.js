import express, { Router } from "express"
import { body } from "express-validator";
import { LoginTechnician } from "../controller/IndexController.js";
import upload from "../middleware/Upload.js";

const technicianRouter = express.Router();

technicianRouter.post("login", [
    body("username").isString().notEmpty().withMessage("Username must be provided"),
    body("password").isString().isLength({ min: 8 }).notEmpty().withMessage("Password must be at least 8 characters long")
], LoginTechnician)

technicianRouter.post("register", upload.single("id_card_image"), [
    body("full_name").isString().notEmpty().withMessage("Fullname must be provided"),
    body("email").isString().isEmail().notEmpty().withMessage("Invalid email"),
    body("phone").isString().isLength({ min: 10, max: 10 }).notEmpty().withMessage("Invalid phone number"),
    body("age").isInt({ min: 1 }).withMessage("Age must be a number and at least 1"),
    body("id_card").isString().isLength({ min: 13, max: 13 }).notEmpty().withMessage("Invalid ID card number"),
    body("address").isString().notEmpty().withMessage("Address must be not empty"),
    body("district").isString().notEmpty().withMessage("District must be provided"),
    body("province").isString().notEmpty().withMessage("Province must be provided"),
    body("birth_date").isDate().notEmpty().withMessage("Birth date must be provided")
])

export default technicianRouter;