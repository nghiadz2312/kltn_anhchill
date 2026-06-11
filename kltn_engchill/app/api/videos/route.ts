import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Video from "@/models/Video";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const isAdmin = searchParams.get("admin") === "true";
        const pageParam = searchParams.get("page");
        const limit = parseInt(searchParams.get("limit") || "12");
        const search = searchParams.get("search") || "";
        const level = searchParams.get("level") || "";

        // Tạo bộ lọc truy vấn
        const query: any = {};
        if (search) {
            query.title = { $regex: search, $options: "i" };
        }
        if (level) {
            query.level = level;
        }

        // Chế độ Admin
        if (isAdmin) {
            const aggregatePipeline: any[] = [];
            
            // Nếu có tìm kiếm/lọc
            if (search || level) {
                const match: any = {};
                if (search) match.title = { $regex: search, $options: "i" };
                if (level) match.level = level;
                aggregatePipeline.push({ $match: match });
            }

            aggregatePipeline.push(
                { $sort: { createdAt: -1 } },
                { $addFields: { segmentCount: { $size: { $ifNull: ["$segments", []] } } } },
                { $project: { script: 0, segments: 0 } }
            );

            if (pageParam) {
                const page = parseInt(pageParam);
                const skip = (page - 1) * limit;
                aggregatePipeline.push({ $skip: skip }, { $limit: limit });

                const videos = await Video.aggregate(aggregatePipeline);
                const total = await Video.countDocuments(query);
                return NextResponse.json({
                    videos,
                    total,
                    totalPages: Math.ceil(total / limit),
                    currentPage: page
                });
            }

            // Trả về toàn bộ (tương thích ngược)
            const videos = await Video.aggregate(aggregatePipeline);
            return NextResponse.json(videos);
        }

        // Chế độ User thường
        if (pageParam) {
            const page = parseInt(pageParam);
            const skip = (page - 1) * limit;

            const videos = await Video.find(query)
                .select("-segments -script")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const total = await Video.countDocuments(query);

            return NextResponse.json({
                videos,
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page
            });
        }

        // Không truyền page -> Trả về toàn bộ (tương thích ngược)
        const videos = await Video.find(query).select("-segments -script").sort({ createdAt: -1 });
        return NextResponse.json(videos);
    } catch (error) {
        console.error("Lỗi API videos:", error);
        return NextResponse.json({ error: "Lỗi DB" }, { status: 500 });
    }
}