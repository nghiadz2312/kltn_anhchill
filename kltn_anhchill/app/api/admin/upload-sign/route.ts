import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Tạo signature để browser upload trực tiếp lên Cloudinary (bypass Vercel 10s timeout)
// api_secret không lộ ra browser — server ký trước, browser dùng signature đó để upload
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export async function GET() {
    try {
        const timestamp = Math.round(new Date().getTime() / 1000);
        const folder = "engchill-audio";

        // Chỉ ký params nằm trong FormData — resource_type là URL path nên không ký
        const signature = cloudinary.utils.api_sign_request(
            { timestamp, folder },
            process.env.CLOUDINARY_API_SECRET!
        );

        return NextResponse.json({
            signature,
            timestamp,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            apiKey: process.env.CLOUDINARY_API_KEY,
            folder,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
