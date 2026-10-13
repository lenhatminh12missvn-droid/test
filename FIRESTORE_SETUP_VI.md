# Bật đồng bộ đám mây cho Study RPG

Bản cập nhật này giữ nguyên giao diện hiện có và đồng bộ các dữ liệu đang lưu ở trình duyệt: tiến độ RPG (XP, Level, S-Coins, streak, phiên học, lịch sử, hồ sơ và cài đặt), danh sách website, lịch học và lịch sử chống trùng câu hỏi Quiz AI.

## 1. Bật Cloud Firestore

1. Mở https://console.firebase.google.com/ và chọn dự án `study-work-46ef5`.
2. Mở **Build → Firestore Database**.
3. Nhấn **Create database** nếu dự án chưa có database.
4. Chọn vị trí gần người dùng (vị trí database không thể đổi dễ dàng sau khi tạo), rồi hoàn tất tạo database.
5. Mở tab **Rules**, thay nội dung bằng nội dung trong file `firestore.rules` ở gói này, rồi nhấn **Publish**.

Rules chỉ cho phép tài khoản Google đã xác thực đọc/ghi tài liệu `users/{uid}` có UID trùng với tài khoản của họ. Không dùng chế độ test mở toàn bộ database.

## 2. Cập nhật website

Sao lưu các file hiện tại trước. Tải lên và ghi đè tại thư mục gốc repository các file sau từ gói cập nhật:

- `firebase-auth.js`
- `main.js`
- `enhancements.js`

Giữ nguyên `index.html`, `style.css` và các file còn lại. Chờ GitHub Pages triển khai xong rồi mở lại website bằng Ctrl+F5.

## 3. Cách đồng bộ hoạt động

- Khi tài khoản Google đăng nhập lần đầu và chưa có tài liệu Firestore, ứng dụng sao lưu dữ liệu hiện có trên trình duyệt lên tài khoản đó.
- Khi tài khoản đã có dữ liệu trên đám mây, bản đám mây sẽ được tải về và thay thế bản local của trình duyệt để tránh trộn dữ liệu của hai tài khoản.
- Các thay đổi tiếp theo được tự lưu sau một khoảng trễ ngắn.
- Khi đăng xuất, ứng dụng dừng đồng bộ; dữ liệu local vẫn còn trên thiết bị.
- Khuyến nghị xuất bản sao lưu JSON trong Cài đặt trước khi cập nhật hoặc đăng nhập tài khoản khác.

## 4. Kiểm tra

1. Đăng nhập Google và xem thông báo trong hộp đăng nhập chuyển thành “Đã bật đồng bộ…” hoặc “Đã đồng bộ dữ liệu học tập”.
2. Hoàn thành một phiên học, thêm một kế hoạch trong Lịch học, chờ 1–2 giây.
3. Firebase Console → Firestore Database → Data sẽ có collection `users` và document mang UID tài khoản.
4. Mở website trên thiết bị/trình duyệt khác, đăng nhập cùng tài khoản và xác nhận dữ liệu xuất hiện.

## Lưu ý quan trọng

- Firebase Web API key là thông tin cấu hình công khai; bảo vệ dữ liệu bằng Authentication và Firestore Security Rules, không dựa vào việc giấu API key.
- Quiz AI hiện dùng API key Gemini nhập trong giao diện. Không dùng API key Gemini có quyền nhạy cảm hoặc chia sẻ key; một ứng dụng công khai nên chuyển lời gọi AI qua backend có xác thực và giới hạn sử dụng.
- Bản đồng bộ này lưu một tài liệu cho mỗi người dùng. Nếu lịch sử phát triển quá lớn, nên tách lịch sử học và sự kiện lịch thành các subcollection.
