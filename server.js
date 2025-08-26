import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const ai = new GoogleGenAI({ apiKey: "AIzaSyDrxTCTnpYvBjPpY5o87ZRcuhP8hHYiqbU" });
const app = express();
app.use(cors());
app.use(bodyParser.json());

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
  const { phongTroText } = req.body;
  const nextId = getNextId();
  const jsonFormat = `\nHãy chuyển thông tin phòng trọ sau sang JSON với các trường: id, title, price (đặt theo format sau: 5tr5 sẽ thành 5.5), address, area, electricPrice (format sẽ là 4k sẽ là 4000), waterPrice, servicePrice, parkingPrice, description, images. Nếu không có thông tin thì để giá trị null hoặc chuỗi rỗng.\nid là ${nextId}.\n`;
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
    appendRoomToJson(newRoom);
    res.json({ message: "Thêm phòng thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi: " + err.message });
  }
});

app.listen(3000, () => {
  console.log("API server running at http://localhost:3000");
});
