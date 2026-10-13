# Hướng dẫn bật Bảng xếp hạng Study RPG

## Tính năng
- Thêm trang **Bảng xếp hạng** vào thanh điều hướng, giữ nguyên các trang hiện có.
- Xếp hạng theo XP kiếm được từ các phiên học trong 7 ngày gần nhất (ước tính 2 XP/phút).
- Hiển thị tối đa 50 người, thứ hạng, tên hiển thị, avatar, streak và hạng Bronze/Silver/Gold/Diamond.
- Tài liệu riêng trong `users/{uid}` vẫn chỉ tài khoản sở hữu đọc/ghi được.
- Bảng công khai dùng `leaderboard/{uid}`; không công khai email.

## Cập nhật GitHub
Tải lên và ghi đè các file ở thư mục gốc:
- `index.html`
- `style.css`
- `main.js`
- `firebase-auth.js`

Giữ lại các file còn lại. Chờ GitHub Pages triển khai xong.

## Cập nhật Firestore Rules
Firebase Console → Build → Firestore Database → Rules. Thay rules bằng nội dung trong `firestore.rules`, rồi nhấn **Publish**.

## Cách kiểm tra
1. Đăng nhập Google trên website.
2. Hoàn thành một phiên học hoặc thay đổi hồ sơ để kích hoạt đồng bộ.
3. Mở Firestore → Data. Kiểm tra có collection `leaderboard` và document có ID bằng UID tài khoản.
4. Mở trang **Bảng xếp hạng** và nhấn **Làm mới**.
5. Để kiểm tra nhiều người, cần đăng nhập bằng tài khoản Google khác và có dữ liệu học tập.

## Giới hạn quan trọng
Đây là bản MVP: XP tuần được tính từ lịch sử phiên học lưu trên trình duyệt, và trình duyệt gửi điểm lên Firestore. Người dùng có thể sửa dữ liệu phía client, nên chưa chống gian lận. Không dùng bảng này cho phần thưởng có giá trị thật. Muốn chống gian lận, cần chuyển việc ghi điểm sang Cloud Functions hoặc backend đáng tin cậy.

Điểm XP tuần được ước tính bằng `2 XP × số phút phiên học` trong 7 ngày gần nhất; đây là điểm bảng xếp hạng riêng, không thay đổi XP/Level hiện có trong ứng dụng.
