import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const ai = new GoogleGenAI({ apiKey: "AIzaSyDrxTCTnpYvBjPpY5o87ZRcuhP8hHYiqbU" });

function getNextId() {
  const data = JSON.parse(fs.readFileSync("data.json", "utf8"));
  const ids = data.rooms.map(room => room.id);
  return Math.max(...ids) + 1;
}

// Hàm thêm dữ liệu mới vào mảng rooms trong data.json
function appendRoomToJson(newRoom) {
  const filePath = "data.json";
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  data.rooms.push(newRoom);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

async function main(phongTroText) {
  const nextId = getNextId();

  const jsonFormat = `
Hãy chuyển thông tin phòng trọ sau sang JSON với các trường: id, title, price (đặt theo format sau: 5tr5 sẽ thành 5.5), address, area, electricPrice (format sẽ là 4k sẽ là 4000), waterPrice, servicePrice, parkingPrice, description, images. Nếu không có thông tin thì để giá trị null hoặc chuỗi rỗng.
id là ${nextId}.
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: jsonFormat + phongTroText }] }]
  });

  // Parse kết quả trả về từ Gemini (giả sử là JSON)
  try {
    // Loại bỏ các ký tự ```json, ``` hoặc dấu xuống dòng thừa
    let text = response.text.trim();
    if (text.startsWith("```json")) text = text.replace("```json", "");
    if (text.startsWith("```")) text = text.replace("```", "");
    if (text.endsWith("```")) text = text.slice(0, -3);
    text = text.trim();

    const newRoom = JSON.parse(text);
    appendRoomToJson(newRoom);
    console.log("Thêm phòng trọ mới thành công!");
  } catch (err) {
    console.error("Không thể parse JSON từ kết quả Gemini:", err);
    console.log("Kết quả trả về:", response.text);
  }
}

// Export hàm main ra window để gọi từ HTML
if (typeof window !== 'undefined') {
  window.main = main;
}