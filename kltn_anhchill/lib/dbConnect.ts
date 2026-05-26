import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error("Vui long kiem tra lai file .env.local, chua co MONGODB_URI");
}

// Cache kết nối vào global để tái sử dụng giữa các Serverless Function invocations (Vercel warm lambda)
// Reset cached.promise = null khi lỗi để request tiếp theo có thể retry thay vì mắc kẹt ở rejected promise

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
            // bufferCommands không set false — tránh lỗi 500 khi cold-start (Mongoose tự buffer)
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        };

        // @ts-ignore
        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            console.log("[dbConnect] Kết nối MongoDB thành công - KLTN_anhchill / Nguyễn Giang Tuấn Nghĩa A46562");
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (error) {
        // Reset promise để request tiếp theo có thể thử kết nối lại
        cached.promise = null;
        throw error;
    }

    return cached.conn;
}

export default dbConnect;