import express from 'express';
import { getRevenueStats } from "../controller/PaymentController.js";

const PaymentRouter = express.Router();

PaymentRouter.get("/revenue", getRevenueStats);

export default PaymentRouter;