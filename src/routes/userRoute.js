import express, { Router } from "express"
import { body } from "express-validator";
import { LoginUser } from "../controller/IndexController.js";

const app = express();
const userRouter = express.Router();

userRouter.post("login", [
    body("username").isString().notEmpty().withMessage("Username must be provided"),
    body("password").isLength({ min: 8 }).withMessage("Invalid email")
], LoginUser)

export default userRouter;