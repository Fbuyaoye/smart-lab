import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@smart-lab/experiment-report-toolkit",
    "@smart-lab/curve-fit-toolkit"
  ],
};

export default nextConfig;