const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('--- Đang chuẩn bị gói phục vụ tĩnh cho cPanel ---');
const webDist = path.join(__dirname, '../apps/web/dist');
const apiTarget = path.join(__dirname, '../apps/api/client');

if (fs.existsSync(webDist)) {
  copyDir(webDist, apiTarget);
  console.log('✅ Đã sao chép apps/web/dist -> apps/api/client');
} else {
  console.error('❌ Không tìm thấy apps/web/dist, hãy chạy npm run build:web trước!');
}
