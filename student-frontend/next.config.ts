import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 删掉 basePath: '/student',
  transpilePackages: [
    "@smart-lab/experiment-report-toolkit",
    "@smart-lab/curve-fit-toolkit"
  ],
  // 添加以下 rewrites
}

export default nextConfig;