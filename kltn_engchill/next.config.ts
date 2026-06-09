import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'standalone' tạo ra thư mục .next/standalone chứa
  // đúng những gì cần thiết để chạy production — không cần copy toàn bộ node_modules
  // Đây là cách tối ưu nhất để đóng gói Next.js vào Docker image
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb'
    },
  },
};

export default nextConfig;
