import { NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";
import dbConnect from "@/lib/dbConnect";
import Video from "@/models/Video";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 *
 * Vấn đề với YouTube direct URL:
 *   - YouTube phục vụ audio dài (bài hát, podcast...) theo định dạng DASH/fragmented
 *   - Trình duyệt không thể phát trực tiếp vì:
 *     1. Thiếu header Access-Control-Allow-Origin (CORS bị chặn)
 *     2. Format fragmented không hỗ trợ seek (tua) trong thẻ <audio>
 *     3. Không có header Content-Length → không đọc được duration (0:00)
 *
 * Giải pháp: Audio Proxy
 *   → Client gọi /api/audio-proxy?videoId=xxx
 *   → Server lấy luồng audio từ YouTube bằng ytdl-core (server-side không bị CORS)
 *   → Server stream nội dung đó về client với đúng headers
 *   → Trình duyệt nhận được stream chuẩn, hiện đúng duration và có thể seek
 *
 * GET /api/audio-proxy?videoId=<mongoId>
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const videoId = searchParams.get("videoId");

        if (!videoId) {
            return NextResponse.json({ error: "Thiếu videoId" }, { status: 400 });
        }

        await dbConnect();
        const video = await Video.findById(videoId).select("videoUrl title").lean();

        if (!video) {
            return NextResponse.json({ error: "Không tìm thấy video" }, { status: 404 });
        }

        const youtubeUrl = video.videoUrl;
        if (!youtubeUrl || (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be'))) {
            return NextResponse.json({ error: "Không phải link YouTube" }, { status: 400 });
        }

        // Lấy thông tin format từ YouTube
        const info = await ytdl.getInfo(youtubeUrl);

        // Ưu tiên format mp4 audio có bitrate cao (thường tương thích nhất với HTML5)
        // Filter: audioonly và có container mp4 → trình duyệt hỗ trợ tốt nhất
        let format = ytdl.chooseFormat(info.formats, {
            quality: 'highestaudio',
            filter: (f) => f.hasAudio && !f.hasVideo && f.container === 'mp4',
        });

        // Fallback: nếu không có mp4 thì lấy bất kỳ audioonly
        if (!format) {
            format = ytdl.chooseFormat(info.formats, { filter: 'audioonly' });
        }

        if (!format || !format.url) {
            return NextResponse.json({ error: "Không tìm được luồng audio" }, { status: 404 });
        }

        // Lấy header Range từ request (để hỗ trợ seek/tua)
        const rangeHeader = req.headers.get("range");

        // Fetch audio từ YouTube phía server (không bị CORS)
        const ytResponse = await fetch(format.url, {
            headers: rangeHeader ? { Range: rangeHeader } : {},
        });

        if (!ytResponse.ok && ytResponse.status !== 206) {
            return NextResponse.json({ error: "Lỗi khi lấy audio từ YouTube" }, { status: 502 });
        }

        // Chuẩn bị headers trả về client
        const headers: Record<string, string> = {
            "Content-Type": format.mimeType?.split(";")[0] || "audio/mp4",
            "Accept-Ranges": "bytes",
            "Cache-Control": "private, max-age=3600",
        };

        // Truyền qua các headers quan trọng từ YouTube
        const contentLength = ytResponse.headers.get("content-length");
        const contentRange = ytResponse.headers.get("content-range");
        if (contentLength) headers["Content-Length"] = contentLength;
        if (contentRange) headers["Content-Range"] = contentRange;

        // Stream trực tiếp từ YouTube → client
        return new Response(ytResponse.body, {
            status: ytResponse.status,
            headers,
        });

    } catch (error: any) {
        console.error("Audio proxy error:", error);
        return NextResponse.json({ error: error.message || "Lỗi server" }, { status: 500 });
    }
}
