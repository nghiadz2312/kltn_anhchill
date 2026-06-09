import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Collection from "@/models/Collection";
import Video from "@/models/Video";

/** DELETE /api/collections/[id] — Xóa bộ sưu tập */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const role = req.headers.get("x-user-role");
        if (role !== "admin") {
            return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
        }

        const { id } = await params;

        // 1. Xóa reference trong các Video thuộc collection này
        await Video.updateMany(
            { collections: id },
            { $pull: { collections: id } }
        );

        // 2. Xóa chính collection
        const deleted = await Collection.findByIdAndDelete(id);

        if (!deleted) {
            return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
