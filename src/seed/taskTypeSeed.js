import mongoose from "mongoose";
import dotenv from "dotenv";
import TaskType from "../models/TaskType.js";

dotenv.config();

const seedTaskTypes = async () => {
    try {
        await mongoose.connect(process.env.MONGOURL);

        const taskTypes = [
            { name: "เครื่องปรับอากาศ" },
            { name: "ตู้เย็น" },
            { name: "เครื่องซักผ้า" },
            { name: "ทีวี" },
            { name: "พัดลม" },
            { name: "เตารีด" },
            { name: "เครื่องดูดฝุ่น" },
            { name: "ไมโครเวฟ" },
            { name: "เครื่องทำน้ำอุ่น" },
            { name: "อื่นๆ" }
        ];

        await TaskType.deleteMany();
        await TaskType.insertMany(taskTypes);

        console.log("Seeding task_types สำเร็จแล้ว");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedTaskTypes();
