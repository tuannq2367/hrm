const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const deployFullDir = path.join(rootDir, 'deploy_hosting');
const deployUpdateDir = path.join(rootDir, 'deploy_update_only');

function cleanAndMkdir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest, filterFn) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (filterFn && !filterFn(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, filterFn);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('==================================================================');
console.log('📦 BẮT ĐẦU ĐÓNG GÓI ỨNG DỤNG CHO HOSTING (cPanel / VPS / Cloud)...');
console.log('==================================================================');

// 1. Dọn dẹp thư mục deploy cũ
console.log('1. Khởi tạo thư mục đóng gói sạch sẽ...');
cleanAndMkdir(deployFullDir);
cleanAndMkdir(deployUpdateDir);

// Tạo các thư mục con cho gói FULL
fs.mkdirSync(path.join(deployFullDir, 'dist'), { recursive: true });
fs.mkdirSync(path.join(deployFullDir, 'client'), { recursive: true });
fs.mkdirSync(path.join(deployFullDir, 'prisma'), { recursive: true });
fs.mkdirSync(path.join(deployFullDir, 'uploads'), { recursive: true });
fs.mkdirSync(path.join(deployFullDir, 'shared'), { recursive: true });

// Tạo các thư mục con cho gói UPDATE ONLY (KHÔNG CÓ uploads và KHÔNG CÓ dev.db)
fs.mkdirSync(path.join(deployUpdateDir, 'dist'), { recursive: true });
fs.mkdirSync(path.join(deployUpdateDir, 'client'), { recursive: true });
fs.mkdirSync(path.join(deployUpdateDir, 'prisma'), { recursive: true });
fs.mkdirSync(path.join(deployUpdateDir, 'shared'), { recursive: true });

// 2. Sao chép Backend dist
console.log('2. Sao chép mã nguồn Backend đã biên dịch (apps/api/dist -> dist)...');
const apiDist = path.join(rootDir, 'apps/api/dist');
if (fs.existsSync(apiDist)) {
  copyDir(apiDist, path.join(deployFullDir, 'dist'));
  copyDir(apiDist, path.join(deployUpdateDir, 'dist'));
  console.log('   ✅ Đã sao chép dist Backend thành công.');
} else {
  console.error('   ❌ LỖI: Không tìm thấy apps/api/dist! Hãy chạy build:api trước.');
  process.exit(1);
}

// 3. Sao chép Frontend client
console.log('3. Sao chép giao diện Web React PWA (apps/web/dist -> client)...');
const webDist = path.join(rootDir, 'apps/web/dist');
if (fs.existsSync(webDist)) {
  copyDir(webDist, path.join(deployFullDir, 'client'));
  copyDir(webDist, path.join(deployUpdateDir, 'client'));
  console.log('   ✅ Đã sao chép toàn bộ giao diện Web & PWA thành công.');
} else {
  console.error('   ❌ LỖI: Không tìm thấy apps/web/dist! Hãy chạy build:web trước.');
  process.exit(1);
}

// 4. Sao chép thư viện dùng chung @snake/shared
console.log('4. Sao chép thư viện dùng chung @snake/shared (shared/)...');
const sharedSrc = path.join(rootDir, 'packages/shared');
if (fs.existsSync(sharedSrc)) {
  copyDir(sharedSrc, path.join(deployFullDir, 'shared'), (name) => name !== 'node_modules');
  copyDir(sharedSrc, path.join(deployUpdateDir, 'shared'), (name) => name !== 'node_modules');
  console.log('   ✅ Đã sao chép @snake/shared thành công.');
}

// 5. Sao chép Prisma Schema & Database SQLite
console.log('5. Xử lý Prisma Schema & Database SQLite...');
const prismaSchema = path.join(rootDir, 'apps/api/prisma/schema.prisma');
const prismaDb = path.join(rootDir, 'apps/api/prisma/dev.db');

if (fs.existsSync(prismaSchema)) {
  fs.copyFileSync(prismaSchema, path.join(deployFullDir, 'prisma/schema.prisma'));
  fs.copyFileSync(prismaSchema, path.join(deployUpdateDir, 'prisma/schema.prisma'));
  console.log('   ✅ Đã sao chép prisma/schema.prisma vào cả 2 gói.');
}

// Database chỉ sao chép vào gói FULL INSTALL, TUYỆT ĐỐI KHÔNG đưa vào gói UPDATE ONLY
if (fs.existsSync(prismaDb)) {
  fs.copyFileSync(prismaDb, path.join(deployFullDir, 'prisma/dev.db'));
  fs.copyFileSync(prismaDb, path.join(deployFullDir, 'dev.db'));
  console.log('   ✅ [Gói Full Install] Đã sao chép database SQLite hiện tại.');
}
console.log('   🛡️ [Gói Update Only] BỎ QUA dev.db để bảo vệ dữ liệu đang chạy trên hosting!');

// 6. Thư mục uploads chỉ đưa vào gói Full Install
const uploadsSrc = path.join(rootDir, 'uploads');
if (fs.existsSync(uploadsSrc)) {
  copyDir(uploadsSrc, path.join(deployFullDir, 'uploads'));
  console.log('   ✅ [Gói Full Install] Đã sao chép thư mục uploads.');
}
console.log('   🛡️ [Gói Update Only] BỎ QUA uploads để không đè tài liệu scan đã upload trên server!');

// 7. ĐÓNG GÓI PRISMA CLIENT & LINUX QUERY ENGINES VÀO prisma-generated (KHÔNG TẠO node_modules ĐỂ CHỐNG LỖI CLOUDLINUX SYMLINK)
console.log('6. Đóng gói sẵn Prisma Client & Linux Engines (Chống lỗi Out of Memory trên cPanel)...');
const dotPrismaSrc = path.join(rootDir, 'node_modules/.prisma');

const noTmpFilter = (fileName) => !fileName.includes('.tmp');

if (fs.existsSync(dotPrismaSrc)) {
  copyDir(dotPrismaSrc, path.join(deployFullDir, 'prisma-generated/.prisma'), noTmpFilter);
  copyDir(dotPrismaSrc, path.join(deployUpdateDir, 'prisma-generated/.prisma'), noTmpFilter);
  console.log('   ✅ Đã đóng gói sẵn Linux Query Engines vào thư mục prisma-generated.');
  console.log('   🛡️ TUYỆT ĐỐI KHÔNG tạo thư mục node_modules trong gói để tương thích hoàn toàn với CloudLinux NodeJS Selector (symlink mode).');
}

// 8. Tạo file .npmrc để cPanel không tự động chạy prisma compiler gây tràn RAM
const npmrcContent = `prisma_skip_postinstall_generate=true\n`;
fs.writeFileSync(path.join(deployFullDir, '.npmrc'), npmrcContent, 'utf8');
fs.writeFileSync(path.join(deployUpdateDir, '.npmrc'), npmrcContent, 'utf8');

// 9. Tạo file app.js (Entry Point cho Hosting - Đầy đủ hook module resolution & error logger)
console.log('7. Tạo file khởi chạy app.js cho hosting cPanel / Node.js...');
const appJsContent = `/**
 * ==============================================================================
 * SNAKE HRM - File khởi chạy chính cho Hosting (cPanel / Phusion Passenger / PM2)
 * Điểm vào ứng dụng: app.js
 * ==============================================================================
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.chdir(__dirname); // Luôn cố định thư mục làm việc tại thư mục ứng dụng
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const Module = require('module');

// 1. Tự động chuyển hướng require('@snake/shared') về thư mục shared nội bộ
const origResolveFilename = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request === '@snake/shared') {
    const sharedIndex = path.join(__dirname, 'shared', 'dist', 'index.js');
    if (fs.existsSync(sharedIndex)) return sharedIndex;
  }
  return origResolveFilename.call(this, request, parent, isMain, options);
};

// 2. Ghi nhật ký lỗi nếu có crash để dễ theo dõi
const logFile = path.join(__dirname, 'app-error.log');
function logError(prefix, err) {
  const msg = \`[\${new Date().toISOString()}] \${prefix}: \${err && (err.stack || err.message || err)}\\n\`;
  try { fs.appendFileSync(logFile, msg, 'utf8'); } catch (e) {}
  console.error(msg);
}
process.on('uncaughtException', (err) => logError('UNCAUGHT_EXCEPTION', err));
process.on('unhandledRejection', (reason) => logError('UNHANDLED_REJECTION', reason));

// 3. Tự động đồng bộ Prisma Linux Engines vào node_modules (CloudLinux Symlink)
let nodeModulesDir = path.join(__dirname, 'node_modules');
try {
  if (fs.existsSync(nodeModulesDir)) {
    nodeModulesDir = fs.realpathSync(nodeModulesDir);
  }
} catch (e) {}

const pSrc = path.join(__dirname, 'prisma-generated', '.prisma');
const pDest = path.join(nodeModulesDir, '.prisma');

function copyDirRecursive(s, d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  for (const ent of fs.readdirSync(s, { withFileTypes: true })) {
    const sp = path.join(s, ent.name);
    const dp = path.join(d, ent.name);
    if (ent.isDirectory()) {
      copyDirRecursive(sp, dp);
    } else {
      try {
        if (!fs.existsSync(dp) || fs.statSync(sp).size !== fs.statSync(dp).size) {
          fs.copyFileSync(sp, dp);
        }
      } catch (e) {}
    }
  }
}

if (fs.existsSync(pSrc)) {
  try {
    copyDirRecursive(pSrc, pDest);
    console.log('[SNAKE HRM] ✅ Đã nạp Prisma Client & Linux Engines thành công.');
  } catch (e) {
    logError('PRISMA_COPY_ERROR', e);
  }
}

// 4. Cấp quyền thực thi cho các file engine .so.node và database SQLite trên Linux
if (process.platform !== 'win32') {
  try {
    const clientDir = path.join(pDest, 'client');
    if (fs.existsSync(clientDir)) {
      for (const file of fs.readdirSync(clientDir)) {
        if (file.endsWith('.so.node')) {
          fs.chmodSync(path.join(clientDir, file), 0o755);
        }
      }
    }
    const prismaDir = path.join(__dirname, 'prisma');
    const dbFile = path.join(prismaDir, 'dev.db');
    if (fs.existsSync(prismaDir)) fs.chmodSync(prismaDir, 0o777);
    if (fs.existsSync(dbFile)) fs.chmodSync(dbFile, 0o666);
    const uploadsDir = path.join(__dirname, 'uploads');
    if (fs.existsSync(uploadsDir)) fs.chmodSync(uploadsDir, 0o777);
  } catch (e) {
    logError('CHMOD_ERROR', e);
  }
}

// 5. Chuẩn hóa đường dẫn DATABASE_URL và UPLOAD_DIR thành đường dẫn tuyệt đối
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('./')) {
  process.env.DATABASE_URL = \`file:\${path.join(__dirname, 'prisma', 'dev.db')}\`;
}
if (!process.env.UPLOAD_DIR || process.env.UPLOAD_DIR.startsWith('.')) {
  process.env.UPLOAD_DIR = path.join(__dirname, 'uploads');
}

// 6. Nhận diện Port của Passenger / LiteSpeed hoặc port 3030
if (typeof PhusionPassenger !== 'undefined') {
  process.env.PORT = 'passenger';
} else if (!process.env.PORT) {
  process.env.PORT = '3030';
}

// 7. Khởi chạy server NestJS
try {
  require('./dist/src/main');
} catch (err) {
  logError('STARTUP_ERROR', err);
  throw err;
}
`;
fs.writeFileSync(path.join(deployFullDir, 'app.js'), appJsContent, 'utf8');
fs.writeFileSync(path.join(deployUpdateDir, 'app.js'), appJsContent, 'utf8');

// 10. Tạo file .env
console.log('8. Tạo file cấu hình môi trường .env...');
const envContent = `NODE_ENV=production
PORT=3030
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="snake_hrm_secret_key_production_2026_super_secure"
JWT_EXPIRES_IN="7d"
UPLOAD_DIR="./uploads"
`;
fs.writeFileSync(path.join(deployFullDir, '.env'), envContent, 'utf8');
fs.writeFileSync(path.join(deployUpdateDir, '.env.example'), envContent, 'utf8');

// 11. Tạo package.json độc lập cho hosting
console.log('9. Tạo file package.json độc lập cho hosting...');
const pkgContent = {
  name: "snake-hrm",
  version: "1.0.0",
  description: "SNAKE HRM - Hệ Thống Quản Trị Nhân Sự & Chấm Công Tự Động",
  private: true,
  main: "app.js",
  scripts: {
    start: "node app.js"
  },
  dependencies: {
    "@nestjs/common": "^10.4.0",
    "@nestjs/config": "^3.2.3",
    "@nestjs/core": "^10.4.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/platform-express": "^10.4.0",
    "@nestjs/serve-static": "^4.0.2",
    "@prisma/client": "^5.22.0",
    "@snake/shared": "file:./shared",
    "bcryptjs": "^2.4.3",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "dotenv": "^16.4.5",
    "exceljs": "^4.4.0",
    "multer": "^1.4.5-lts.1",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  }
};
fs.writeFileSync(path.join(deployFullDir, 'package.json'), JSON.stringify(pkgContent, null, 2), 'utf8');
fs.writeFileSync(path.join(deployUpdateDir, 'package.json'), JSON.stringify(pkgContent, null, 2), 'utf8');

// 12. Tạo file hướng dẫn chi tiết
console.log('10. Tạo file hướng dẫn triển khai & cập nhật...');
const guideFullContent = `================================================================================
           HƯỚNG DẪN CÀI ĐẶT MỚI LẦN ĐẦU TRÊN HOSTING CPANEL / VPS
================================================================================

Gói "deploy_FULL_INSTALL.zip" dùng cho LẦN ĐẦU TIÊN đưa ứng dụng lên Hosting.
Gói này đã chứa đầy đủ:
  - Giao diện Web SPA & Mobile PWA trong thư mục "client/".
  - Backend NestJS trong "dist/".
  - Thư viện chia sẻ "shared/".
  - Database SQLite khởi tạo ban đầu trong "prisma/dev.db".
  - Prisma Client & Linux Engines đã nạp sẵn (không lo lỗi thiếu RAM trên cPanel).
  - File chạy "app.js" chuẩn cPanel Phusion Passenger / LiteSpeed.

CÁC BƯỚC CÀI ĐẶT TRÊN CPANEL:
  1. Tải file "deploy_FULL_INSTALL.zip" lên thư mục Document Root trên cPanel -> Bấm "Extract" (Giải nén).
  2. Vào cPanel -> "Setup Node.js App" -> Bấm "Create Application":
     - Node.js version: Chọn 18.x, 20.x hoặc 22.x (khuyên dùng Node 20.x LTS).
     - Application root: Nhập tên thư mục vừa giải nén (ví dụ "hrm.snake.com.vn").
     - Application startup file: Nhập "app.js".
  3. Bấm "Run NPM Install".
  4. Bấm nút "Restart".
  5. Mở website và đăng nhập bằng tài khoản Quản trị viên: 0988888888 / Admin@123.
================================================================================
`;
fs.writeFileSync(path.join(deployFullDir, 'HUONG_DAN_CAI_DAT_MOI.txt'), guideFullContent, 'utf8');

const guideUpdateContent = `================================================================================
   HƯỚNG DẪN CẬP NHẬT BẢN MỚI (UPDATE) MÀ KHÔNG ẢNH HƯỞNG ĐẾN DỮ LIỆU NHÂN SỰ
================================================================================

🛡️ NGUYÊN TẮC AN TOÀN DỮ LIỆU:
  - Gói "deploy_UPDATE_ONLY.zip" này CHỈ CHỨA code tính năng mới (dist, client, shared, app.js).
  - Gói này HOÀN TOÀN KHÔNG CHỨA file database "dev.db" hay thư mục "uploads".
  - Vì vậy, khi giải nén đè lên hosting, toàn bộ dữ liệu nhân sự, lịch sử chấm công,
    bảng lương và tài liệu scan đang chạy trên server SẼ ĐƯỢC GIỮ NGUYÊN 100%!

--------------------------------------------------------------------------------
QUY TRÌNH CẬP NHẬT CHUẨN 3 BƯỚC (CHỈ MẤT 30 GIÂY):
--------------------------------------------------------------------------------

BƯỚC 1 (Sao lưu phòng ngừa - Khuyên dùng):
  - Vào File Manager trên cPanel -> Vào thư mục web của bạn.
  - Chuột phải vào file "prisma/dev.db" (hoặc "dev.db") -> Chọn "Copy" thành "dev.db.bak"
    (hoặc tải về máy tính để lưu trữ).

BƯỚC 2: Tải bản cập nhật mới lên
  - Trong File Manager của cPanel, tải file "deploy_UPDATE_ONLY.zip" lên thư mục web.
  - Chuột phải vào "deploy_UPDATE_ONLY.zip" -> Chọn "Extract" (Giải nén ghi đè).
  - Code mới ở "dist/", "client/" và "shared/" sẽ được cập nhật. Dữ liệu database được giữ nguyên.
  - Xóa file "deploy_UPDATE_ONLY.zip" sau khi giải nén.

BƯỚC 3: Khởi động lại ứng dụng
  - Vào cPanel -> "Setup Node.js App".
  - Bấm nút "Run NPM Install" (để nạp thư viện mới nếu có).
  - Bấm nút "Restart" để nạp code mới.
  - Mở website và trải nghiệm ngay các tính năng mới mà dữ liệu vẫn nguyên vẹn 100%!
================================================================================
`;
fs.writeFileSync(path.join(deployUpdateDir, 'HUONG_DAN_CAP_NHAT_AN_TOAN.txt'), guideUpdateContent, 'utf8');

console.log('==================================================================');
console.log('🎉 ĐÃ ĐÓNG GÓI THÀNH CÔNG 2 BỘ DEPLOY:');
console.log('   1. deploy_hosting      -> Gói Full Setup lần đầu');
console.log('   2. deploy_update_only  -> Gói Update an toàn dữ liệu 100%');
console.log('==================================================================');
