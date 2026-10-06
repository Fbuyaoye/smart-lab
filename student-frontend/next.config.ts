import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 删掉 basePath: '/student',
  transpilePackages: [
    "@smart-lab/experiment-report-toolkit",
    "@smart-lab/curve-fit-toolkit"
  ],
  // 添加以下 rewrites
  async rewrites() {
    return [
      {
        source: '/teacher/:path*',
        destination: 'https://你的教师端Vercel域名/teacher/:path*',
      },
    ];
  },
};

export default nextConfig;