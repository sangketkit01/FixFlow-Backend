import express, { Router } from "express"
import { body } from "express-validator";
import { LoginUser, RegisterUser } from "../controller/IndexController.js";

const userRouter = express.Router();

userRouter.post("login", [
    body("username").isString().notEmpty().withMessage("Username must be provided"),
    body("password").isLength({ min: 8 }).withMessage("Invalid email")
], LoginUser)

userRouter.post("register", [
    body("username").isString().notEmpty().withMessage("Username must be provided"),
    body("email").isEmail().notEmpty().withMessage("Invalid email"),
    body("phone").isString().isLength({ min: 10, max: 10 }).notEmpty().withMessage("Invalid phone number"),
    body("password").isString().isLength({ min: 8 }).notEmpty().withMessage("Password must be at least 8 characters long"),
    body("confirm_password").isString().notEmpty().custom((value, { req }) => {
        if (value != req.body.password) {
            throw new Error("Confirm password does not match password")
        }

        return true;
    })
], RegisterUser)

export default userRouter;