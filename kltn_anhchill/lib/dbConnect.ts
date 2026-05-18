import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error("Vui long kiem tra lai file .env.local, chua co MONGODB_URI");
}

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 *
 * Tại sao cần cache kết nối MongoDB trên Serverless (Vercel)?
 * → Vercel chạy mỗi API route trong một Serverless Function riêng biệt.
 *   Nếu không cache, mỗi request sẽ tạo 1 kết nối MongoDB mới → chậm, tốn tài nguyên.
 *   Bằng cách lưu kết nối vào `global`, chúng ta tái sử dụng kết nối cũ khi Lambda còn "warm".
 *
 * Tại sao KHÔNG dùng `bufferCommands: false`?
 * → Khi cold-start, `mongoose.connect()` mất vài trăm ms để hoàn tất.
 *   `bufferCommands: false` ép Mongoose ném lỗi ngay lập tức nếu DB chưa kết nối xong.
 *   Điều này gây ra lỗi 500 intermittent ở request đầu tiên sau cold-start.
 *   Bỏ option này để Mongoose tự buffer các lệnh DB cho đến khi kết nối sẵn sàng.
 *
 * Tại sao reset `cached.promise = null` khi có lỗi?
 * → Nếu promise bị reject (ví dụ: MongoDB Atlas timeout), `cached.promise` sẽ mãi
 *   là một rejected Promise. Các request tiếp theo sẽ không thể retry kết nối.
 *   Reset về `null` cho phép hàm thử kết nối lại ở request tiếp theo.
 */

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
            // bufferCommands: false đã bị XÓA — đây là nguyên nhân gây 500 khi cold-start
            serverSelectionTimeoutMS: 10000, // Timeout sau 10 giây nếu không tìm được server
            socketTimeoutMS: 45000,          // Timeout sau 45 giây nếu socket không phản hồi
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