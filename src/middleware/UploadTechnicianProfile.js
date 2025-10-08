import multer from "multer";
import path from "path";
import fs from "fs";

// ✅ กำหนดโฟลเดอร์ปลายทางสำหรับเก็บรูปโปรไฟล์
const uploadDir = "public/images/technicians/profile";

// ถ้ายังไม่มีโฟลเดอร์ ให้สร้างขึ้นอัตโนมัติ
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ ตั้งค่าการเก็บไฟล์
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${ext}`);
  },
});

// ✅ ฟิลเตอร์เฉพาะไฟล์รูป
const uploadProfile = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error("ไฟล์ต้องเป็นรูปภาพเท่านั้น (jpg, jpeg, png)"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // จำกัด 5 MB
});

export default uploadProfile;
