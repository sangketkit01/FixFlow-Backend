import express from "express"
import { getAllTaskTypes } from "../controller/TaskTypeController.js"
const taskTypeRouter = express.Router()

taskTypeRouter.get("/get", getAllTaskTypes)

export default taskTypeRouter