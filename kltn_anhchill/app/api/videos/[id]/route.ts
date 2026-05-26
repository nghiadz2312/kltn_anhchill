import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Video from "@/models/Video";

// Lấy đúng 1 video theo id — RESTful thay vì fetch toàn bộ rồi filter ở client (tốn băng thông)

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await dbConnect();

        const video = await Video.findById(id).lean();
        // .lean() → trả về plain JS object thay vì Mongoose document
        //           → nhanh hơn vì không cần tạo các method của Mongoose

        if (!video) {
            return NextResponse.json(
                { error: "Không tìm thấy bài học" },
                { status: 404 }
            );
        }

        // Tăng view count (không cần await — fire and forget)
        Video.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }).exec();

        return NextResponse.json(video);
    } catch (error: any) {
        // Nếu id không đúng format ObjectId, Mongoose sẽ throw CastError
        if (error.name === "CastError") {
            return NextResponse.json(
                { error: "ID video không hợp lệ" },
                { status: 400 }
            );
        }
        return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
    }
}
