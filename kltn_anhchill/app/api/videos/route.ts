import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Video from "@/models/Video";

export async function GET() {
    try {
        await dbConnect();
        const videos = await Video.find({}).sort({ createdAt: -1 });
        return NextResponse.json(videos);
    } catch (error) {
        return NextResponse.json({ error: "Lỗi DB" }, { status: 500 });
    }
}