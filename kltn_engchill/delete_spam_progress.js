// Tự động load các biến môi trường từ file .env.local giống như Next.js
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("❌ Lỗi: Không tìm thấy MONGODB_URI trong file .env.local!");
    process.exit(1);
}

async function cleanProgress() {
    try {
        console.log("🚀 Đang kết nối tới MongoDB Atlas...");
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Kết nối database thành công!");

        // Khởi tạo model UserProgress
        const UserProgress = mongoose.models.UserProgress || mongoose.model('UserProgress', new mongoose.Schema({
            createdAt: Date
        }, { strict: false }));

        // Lọc bài làm spam được tạo trong vòng 2 giờ qua
        const timeLimit = new Date();
        timeLimit.setHours(timeLimit.getHours() - 2);

        const query = {
            createdAt: { $gte: timeLimit }
        };

        console.log("🔍 Đang tìm các bài nộp bài tập spam trong 2 giờ qua...");
        const count = await UserProgress.countDocuments(query);
        console.log(`📦 Tìm thấy ${count} bản ghi nộp bài rác.`);

        if (count > 0) {
            console.log("🗑️ Đang tiến hành xóa...");
            const deleteResult = await UserProgress.deleteMany(query);
            console.log(`✅ Thành công! Đã xóa sạch ${deleteResult.deletedCount} bản ghi nộp bài rác khỏi Database.`);
        } else {
            console.log("🎉 Không có bản ghi nộp bài rác nào trong 2 giờ qua.");
        }

    } catch (error) {
        console.error("❌ Lỗi trong quá trình kết nối hoặc xóa:", error);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Đã ngắt kết nối database.");
    }
}

cleanProgress();
