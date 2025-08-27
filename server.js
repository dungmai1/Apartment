import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import multer from "multer";
import path from "path";
import https from "https";
import http from "http";

const ai = new GoogleGenAI({ apiKey: "AIzaSyDrxTCTnpYvBjPpY5o87ZRcuhP8hHYiqbU" });
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Multer setup for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join("assets", "images"));
  },
  filename: function (req, file, cb) {
    // Đặt tên file: roomId_timestamp_originalname
    const roomId = req.body.roomId || "unknown";
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${roomId}_${timestamp}${ext}`);
  }
});
const upload = multer({ storage });
// API upload images
app.post("/api/upload-images", upload.array("images", 10), (req, res) => {
  // images: tên field trong FormData
  // roomId: gửi kèm trong FormData
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "Không có file ảnh nào được upload" });
  }
  const fileNames = req.files.map(f => f.filename);
  res.json({ message: "Upload ảnh thành công!", files: fileNames });
});

function getNextId() {
  const data = JSON.parse(fs.readFileSync("data.json", "utf8"));
  const ids = data.rooms.map(room => room.id);
  return Math.max(...ids) + 1;
}

function appendRoomToJson(newRoom) {
  const filePath = "data.json";
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  data.rooms.push(newRoom);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

app.post("/api/add-room", async (req, res) => {
  const { phongTroText, images } = req.body;
  const nextId = getNextId();
  const jsonFormat = `\nHãy chuyển thông tin phòng trọ sau sang JSON với các trường: id, title, price (đặt theo format sau: 5tr5 sẽ thành 5.5), address, electricPrice (format sẽ là 4k sẽ là 4000), waterPrice, servicePrice, parkingPrice, description, images. Nếu không có thông tin thì để giá trị null hoặc chuỗi rỗng.\nid là ${nextId}.\n`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: jsonFormat + phongTroText }] }]
    });
    let text = response.text.trim();
    if (text.startsWith("```json")) text = text.replace("```json", "");
    if (text.startsWith("```")) text = text.replace("```", "");
    if (text.endsWith("```")) text = text.slice(0, -3);
    text = text.trim();
    const newRoom = JSON.parse(text);
    
    // Nếu có images từ client, ghi đè vào newRoom.images
    if (images && images.length > 0) {
      newRoom.images = images.map(img => `assets/images/${img}`);
    }
    
    appendRoomToJson(newRoom);
    res.json({ message: "Thêm phòng thành công!", roomId: nextId });
  } catch (err) {
    res.status(500).json({ message: "Lỗi: " + err.message });
  }
});

// API download image
app.post("/api/download-image", async (req, res) => {
  const { roomId, imageUrl } = req.body;
  if (!roomId || !imageUrl) {
    return res.status(400).json({ message: "Thiếu roomId hoặc imageUrl" });
  }
  try {
    const ext = path.extname(imageUrl).split("?")[0] || ".jpg";
    const fileName = `${roomId}_${Date.now()}${ext}`;
    const savePath = path.join("assets", "images", fileName);
    const file = fs.createWriteStream(savePath);
    const client = imageUrl.startsWith("https") ? https : http;
    client.get(imageUrl, response => {
      if (response.statusCode !== 200) {
        return res.status(400).json({ message: "Không thể tải ảnh" });
      }
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        res.json({ message: "Tải ảnh thành công!", fileName });
      });
    }).on("error", err => {
      fs.unlink(savePath, () => {});
      res.status(500).json({ message: "Lỗi tải ảnh: " + err.message });
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi: " + err.message });
  }
});

app.listen(3000, () => {
  console.log("API server running at http://localhost:3000");
});
