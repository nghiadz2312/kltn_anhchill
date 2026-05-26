import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import UserProgress from "@/models/UserProgress";

// Bảng xếp hạng top 10 — tính trực tiếp từ UserProgress thay vì lưu sẵn để tránh inconsistency
export async function GET() {
    await dbConnect();

    const leaderboard = await UserProgress.aggregate([
        // Gom tất cả bài làm theo từng user
        {
            $group: {
                _id: "$userId",
                avgScore: { $avg: "$score" },
                totalAttempts: { $sum: 1 },
                bestScore: { $max: "$score" },
            },
        },
        // Chỉ lấy user đã làm ít nhất 1 bài
        { $match: { totalAttempts: { $gte: 1 } } },
        // Sắp xếp: điểm TB cao nhất trước, nếu bằng thì ai làm nhiều hơn xếp trước
        { $sort: { avgScore: -1, totalAttempts: -1 } },
        // Lấy top 10
        { $limit: 10 },
        // Join với collection users để lấy tên + avatar
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "userInfo",
            },
        },
        { $unwind: "$userInfo" },
        // Chỉ trả về các trường cần thiết (không trả password)
        {
            $project: {
                _id: 1,
                // Chia điểm cho 10 để ra thang điểm 10 (ví dụ 85 -> 8.5)
                avgScore: { $round: [{ $divide: ["$avgScore", 10] }, 1] },
                totalAttempts: 1,
                bestScore: 1,
                name: "$userInfo.name",
                avatar: "$userInfo.avatar",
            },
        },
    ]);

    return NextResponse.json(leaderboard, {
        headers: { "Cache-Control": "no-store" },
    });
}
