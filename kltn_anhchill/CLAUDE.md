@AGENTS.md

# KLTN_anhchill - Project Context & AI Rules

## 1. Thông tin dự án (Project Info)
- **Dự án**: KLTN_anhchill (Khóa luận tốt nghiệp - EngChill)
- **Tác giả**: Nguyễn Giang Tuấn Nghĩa - A46562 - Đại học Thăng Long
- **Mô tả**: Nền tảng học tiếng Anh qua video với các tính năng chép chính tả (Dictation) và làm bài tập (Exercise) được hỗ trợ tự động sinh bằng AI.

## 2. Công nghệ sử dụng (Tech Stack)
- **Framework**: Next.js (App Router)
- **UI/Styling**: React, Tailwind CSS
- **Database**: MongoDB (sử dụng thư viện Mongoose)
- **Mô hình Dữ liệu chính**: `User`, `Video`, `Question`, `UserProgress`

## 3. Quy ước Lập trình (Coding Guidelines)
Khi AI (Claude/Gemini) hoặc lập trình viên viết/sửa code trong dự án này, vui lòng tuân thủ các quy tắc sau:

- **Bảo toàn Dữ liệu Lịch sử (Soft Delete/No Delete)**: Không sử dụng lệnh xóa toàn bộ (ví dụ: `deleteMany`) đối với các bảng như `Question`. Thay vào đó, ưu tiên truy vấn các bản ghi mới nhất để bảo toàn dữ liệu cho tính năng "Xem lại lịch sử làm bài" của người dùng.
- **Chú thích rõ ràng (Vietnamese Comments)**: Thêm các khối chú thích `/** 📘 GIẢI THÍCH CHO HỘI ĐỒNG: ... */` bằng Tiếng Việt vào trước các hàm xử lý logic phức tạp. Điều này giúp tác giả dễ dàng giải thích hệ thống trước hội đồng bảo vệ.
- **Tính điểm nghiêm ngặt (Strict Scoring)**: 
  - Bài tập điền từ/chính tả: Sai 1 ký tự = Sai cả câu.
  - Điểm tổng: Dựa trên tổng số câu hỏi (những câu chưa làm tính là sai).
- **Trải nghiệm người dùng (UX)**: Chú trọng các hiệu ứng phản hồi (feedback) như màu sắc (Xanh = Đúng, Đỏ = Sai), thông báo "Chưa làm bài", và khả năng Nộp bài sớm.

## 4. Lời nhắc về Database (Prompting Reminder)
- Luôn kiểm tra các file trong thư mục `models/` để hiểu cấu trúc database trước khi viết logic truy vấn. 
- Đảm bảo import đúng đường dẫn kết nối cơ sở dữ liệu `import dbConnect from "@/lib/dbConnect";` (KHÔNG DÙNG `@/lib/mongodb`).
