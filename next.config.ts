import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "export",
	distDir: process.env.NEXT_DEMO_DIST_DIR || ".next",
	poweredByHeader: false,
	images: {
		unoptimized: true,
	},
};

export default nextConfig;
