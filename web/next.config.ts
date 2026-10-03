import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";
const jazz = process.env.JAZZCASH_ENV === "production" ? "https://payments.jazzcash.com.pk" : "https://sandbox.jazzcash.com.pk";
const storage = process.env.STORAGE_PUBLIC_URL ?? "";

/** Content Security Policy — tight defaults with the few third parties the site really uses. */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${storage}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self' blob: data: ${storage}`.trim(),
  `media-src 'self' blob: ${storage}`.trim(),
  "worker-src 'self' blob:",
  "frame-src https://www.google.com https://sketchfab.com https://www.youtube-nocookie.com",
  `form-action 'self' ${jazz}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    // Six product photos / GLB models are uploaded through server actions.
    serverActions: { bodySizeLimit: "30mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Camera (POS barcode scanning) and microphone (chat voice notes) for our own origin only.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=()" },
          ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
        ],
      },
    ];
  },
};

export default nextConfig;
