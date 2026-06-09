import { NextResponse } from "next/server";
import { headers } from "next/headers";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Video from "@/models/Video";
import UserProgress from "@/models/UserProgress";
import Question from "@/models/Question";

// API thống kê hệ thống cho Admin Dashboard — chỉ admin mới gọi được
export async function GET() {
    const headersList = await headers();
    const role = headersList.get("x-user-role");

    // x-user-role được middleware inject sau khi verify JWT
    if (role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    // Chạy song song 9 query — tổng thời gian = query chậm nhất (thay vì cộng dồn)
    const [
        totalUsers,
        totalVideos,
        totalProgress,
        totalQuestions,
        avgScoreAgg,
        topVideos,
        recentUsers,
        levelStats,
        progressByDay,
    ] = await Promise.all([
        User.countDocuments({ role: "student" }),
        Video.countDocuments(),
        UserProgress.countDocuments(),
        Question.countDocuments(),
        UserProgress.aggregate([
            { $group: { _id: null, avgScore: { $avg: "$score" } } },
        ]),

        Video.find()
            .sort({ viewCount: -1 })
            .limit(5)
            .select("title level viewCount"),

        User.find({ role: "student" })
            .sort({ createdAt: -1 })
            .limit(50)
            .select("name email createdAt avatar")
            .lean(),

        Video.aggregate([
            { $group: { _id: "$level", count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]),

        UserProgress.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                    },
                    count: { $sum: 1 },
                    avgScore: { $avg: "$score" },
                },
            },
            { $sort: { _id: 1 } },
        ]),
    ]);

    // Score lưu thang 100 trong DB, chia 10 để hiển thị thang 10
    const avgScore =
        avgScoreAgg.length > 0
            ? Math.round((avgScoreAgg[0].avgScore / 10) * 10) / 10
            : 0;

    return NextResponse.json({
        overview: {
            totalUsers,
            totalVideos,
            totalProgress,
            totalQuestions,
            avgScore,
        },
        topVideos,
        recentUsers,
        levelStats,
        progressByDay,
    });
}
