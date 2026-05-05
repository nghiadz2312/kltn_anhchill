import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb'
    },
    // 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
    // Cấu hình này cho phép Proxy chấp nhận các request có dung lượng lớn (100MB).
    // Nếu không có dòng này, Proxy sẽ chặn mọi file > 10MB để bảo vệ Server,
    // dẫn đến lỗi "Request body exceeded 10MB".
    proxyClientMaxBodySize: '100mb',
  },
};

export default nextConfig;
