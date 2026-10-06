import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/student', // 加这一行
  transpilePackages: [
    "@smart-lab/experiment-report-toolkit",
    "@smart-lab/curve-fit-toolkit"
  ],
};

export default nextConfig;