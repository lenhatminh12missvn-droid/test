# Study RPG — macOS Edition

Ứng dụng học tập phong cách macOS, gồm Focus Mode, nhiệm vụ RPG, thống kê, lịch học, quản lý liên kết website và đăng nhập Google qua Firebase Authentication.

## Chạy thử

Vì ứng dụng dùng JavaScript modules và Firebase Authentication, hãy chạy qua HTTP server thay vì mở `index.html` bằng `file://`.

Ví dụ với Python:

```bash
python -m http.server 8000
```

Sau đó mở http://localhost:8000

## Triển khai bằng GitHub Pages

1. Đưa toàn bộ file trong thư mục này lên thư mục gốc của repository.
2. Vào **Settings → Pages**.
3. Chọn **Deploy from a branch**, branch `main`, folder `/(root)` rồi lưu.
4. Trong Firebase Console → Authentication → Settings → Authorized domains, thêm domain GitHub Pages của bạn (ví dụ `yourname.github.io`).
5. Kiểm tra Google là nhà cung cấp đăng nhập đã được bật trong Firebase Authentication.

## Lưu ý bảo mật

- Firebase Web API key trong cấu hình client thường không phải khóa bí mật; bảo vệ dữ liệu bằng Firebase Security Rules và giới hạn API theo nhu cầu.
- Không commit Gemini API key, mật khẩu, service-account JSON hoặc token riêng tư.
- Đăng nhập Google không tự đồng bộ dữ liệu học tập lên cloud. Muốn đồng bộ giữa thiết bị cần thiết kế và bảo vệ cơ sở dữ liệu riêng, ví dụ Cloud Firestore với Security Rules.
