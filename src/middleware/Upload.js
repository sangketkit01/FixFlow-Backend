
import multer from "multer";
import path from "path";
import fs from "fs";

const pathMap = {
    technician_registration_id_card_image: "public/registration/id_card",
    admin_id_card_image: "public/admins/id_card",
    task_image: "public/tasks/images",
    user_profile_image: "public/users/profile",
    technician_profile_image: "public/technicians/profile",
    admin_profile_image: "public/admins/profile",
    slip_image: "public/payments/slips"
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = pathMap[file.fieldname] || "public/uploads";

        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const safeName = file.originalname.replace(/\s+/g, "_");
        cb(null, Date.now() + "-" + safeName);
    }
});

const upload = multer({ storage });
export default upload;
