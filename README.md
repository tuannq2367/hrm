# Hệ Thống Quản Lý Hành Chính & Nhân Sự (HRM)

Hệ thống quản lý nhân sự, hồ sơ scan, thủ tục hành chính, chấm công theo dõi nợ làm bù, và tính bảng lương tự động theo quy chế công ty.

---

## 1. Công nghệ sử dụng
- **Backend**: NestJS, Prisma ORM, JWT, BcryptJS.
- **Database**: SQLite (kèm WAL mode tối ưu tốc độ đọc/ghi đồng thời).
- **Frontend**: React, TypeScript, Ant Design, Vite (giao diện tiếng Việt, hỗ trợ giao diện điện thoại).
- **Môi trường chạy**: Tối ưu sẵn cho **Hosting Nhân Hòa cPanel** (Setup Node.js App) hoặc VPS.

---

## 2. Tài khoản quản trị mặc định (Seed)
- **Số điện thoại**: `0988888888`
- **Mật khẩu**: `Admin@123`
- **Vai trò**: `ADMIN` (Toàn quyền)

> Khi thêm nhân sự mới, hệ thống tự động sinh tài khoản với mật khẩu mặc định là **6 số cuối số điện thoại** và kích hoạt trạng thái **bắt buộc đổi mật khẩu ở lần đầu đăng nhập**.

---

## 3. Các quy chế đã hiện thực hóa
1. **Quy đổi công theo số giờ làm thực tế**:
   - `< 1.0h`: 0 công
   - `1.0h đến < 2.9h`: 1/4 công (0.25)
   - `2.9h đến < 4.9h`: 1/2 công (0.50)
   - `4.9h đến 6.5h`: 3/4 công (0.75, đúng 6.5h vẫn là 3/4)
   - `> 6.5h`: 1.0 công đầy đủ
2. **Quy tắc đi muộn / về sớm**:
   - Vào trước hoặc đúng 08:15: Đúng giờ.
   - Đi muộn 3 ngày làm việc liên tiếp: Phạt 100.000đ/chuỗi và đưa vào danh sách cảnh báo.
   - Về sớm 5-10 phút (việc gấp): Tối đa 7 lần/tháng, quá 7 lần đưa vào danh sách nhắc nhở.
3. **8 loại đơn từ hành chính**:
   - Xin đi muộn / về sớm (miễn hoặc xin làm bù)
   - Đăng ký làm bù sau 17h (hạn bù là ngày làm việc kế tiếp, thứ 7 dời sang thứ 2)
   - Làm thêm giờ (OT sau 17h, đơn giá 50k/h + thưởng bậc 150k/300k/400k)
   - Làm thông trưa (về sớm 16h tính đủ công)
   - Nghỉ phép năm (tự động trừ quỹ phép)
   - Nghỉ không lương
   - Giải trình quên chấm công (Admin có thể chấp nhận đủ công thủ công)
4. **Quy chế Lương tự động**:
   - Công chuẩn: 26 ngày.
   - Lương thỏa thuận = LCB + Phụ cấp (10%) + Lương quản lý (cấp 0-3) + Lương kỹ năng.
   - Thử việc: LCB, LKN, LQL nhận 85%, phụ cấp nhận 100%, miễn nộp 50k công đoàn.

---

## 4. Hướng dẫn chạy thử ở máy cá nhân (Local)

### Cách 1: Click 1 chạm bằng file `.bat` (Khuyên dùng)
- Chỉ cần **nhấp đúp chuột vào file `start-hrm.bat`** trong thư mục dự án.
- Hệ thống sẽ tự động khởi động máy chủ và tự động mở trình duyệt tại: `http://localhost:3030`.

### Cách 2: Chạy bằng dòng lệnh
```bash
# Khởi chạy toàn bộ hệ thống (gồm cả Giao diện Web và API Backend):
node app.js
```

---

## 5. Cơ chế Ghi Log Lỗi & Quản lý Xử lý (Error Tracking & Resolution)

Hệ thống được tích hợp bộ lọc bắt lỗi toàn cục (`AllExceptionsFilter`):
1. **Ghi log ra file**: Mọi lỗi 500 hoặc ngoại lệ không lường trước được ghi chi tiết kèm thời gian, API, và Stack Trace vào thư mục `logs/error.log` và `logs/runtime.log`.
2. **Theo dõi theo Mã Lỗi (Trace ID)**: Mỗi lỗi sinh ra một mã định danh duy nhất (VD: `ERR-xxxxxx`).
3. **Quản lý trạng thái OPEN / RESOLVED**:
   - **Trên giao diện Web**: Quản trị viên vào mục **"Nhật ký Lỗi Hệ thống"** (icon con bọ đỏ), xem chi tiết Stack Trace và nhấn nút **"Chuyển Resolved"** kèm ghi chú cách khắc phục.
   - **Bằng file `.bat`**: Nhấp đúp vào file `check-errors.bat` để xem danh sách lỗi, tra cứu chi tiết và đánh dấu đã sửa (RESOLVED) trực tiếp từ giao diện dòng lệnh.
   - **Bằng câu lệnh Node.js**:
     ```bash
     # Liệt kê lỗi đang mở (OPEN):
     node scripts/manage-errors.js list OPEN

     # Xem chi tiết một mã lỗi:
     node scripts/manage-errors.js detail <Mã-Lỗi>

     # Đánh dấu đã sửa:
     node scripts/manage-errors.js resolve <Mã-Lỗi> "Ghi chú cách sửa"
     ```

---

## 6. Hướng dẫn Triển khai lên Hosting Nhân Hòa (cPanel)

1. Đăng nhập vào cPanel Nhân Hòa -> tìm mục **Software** -> chọn **Setup Node.js App**.
2. Nhấn **Create Application**:
   - **Node.js version**: Chọn bản 20.x hoặc 18.x.
   - **Application mode**: `Production`.
   - **Application root**: `hrm` (thư mục chứa mã nguồn).
   - **Application startup file**: `app.js`.
3. Tải toàn bộ mã nguồn lên thư mục `hrm` (hoặc đẩy qua Git/FTP).
4. Vào Terminal trên cPanel hoặc giao diện Node.js App bấm **Run NPM Install**, sau đó bấm **Restart App**.
5. Truy cập tên miền của bạn để sử dụng!
