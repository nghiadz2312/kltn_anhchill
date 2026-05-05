import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error("Vui long kiem tra lai file .env.local, chua co MONGODB_URI");
}

// @ts-ignore
let cached = global.mongoose;

if (!cached) {
    // @ts-ignore
    cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        };

        // @ts-ignore
        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            console.log("Kết nối dữ liệu thành công cho dự án KLTN_anhchill - Sinh viên: Nguyễn Giang Tuấn Nghĩa (A46562) - Đại học Thăng Long");
            return mongoose;
        });
    }
    cached.conn = await cached.promise;
    return cached.conn;
}

export default dbConnect;