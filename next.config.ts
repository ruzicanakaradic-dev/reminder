import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Upload logoa korisnice (brend_logo) ide kroz server akciju; podigni limit
    // iznad podrazumevanih 1MB da stane realna slika logoa.
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
