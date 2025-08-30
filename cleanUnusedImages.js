import fs from 'fs';
import path from 'path';

// Đọc data.json và lấy danh sách ảnh sử dụng
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const usedImages = new Set();
data.rooms.forEach(room => {
  if (room.images && Array.isArray(room.images)) {
    room.images.forEach(img => {
      // Chỉ lấy tên file, không lấy đường dẫn
      const fileName = path.basename(img);
      usedImages.add(fileName);
    });
  }
});

// Lấy danh sách file trong thư mục images
const imagesDir = path.join('assets', 'images');
const allImages = fs.readdirSync(imagesDir);

// Xóa các file không sử dụng
allImages.forEach(file => {
  if (!usedImages.has(file)) {
    fs.unlinkSync(path.join(imagesDir, file));
    console.log('Deleted unused image:', file);
  }
});