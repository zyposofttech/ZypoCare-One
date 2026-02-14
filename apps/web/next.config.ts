import type { NextConfig } from "next";

const CORE_API_URL =
  process.env.CORE_API_URL ??
  (process.env.VERCEL ? "https://zypocare-one.onrender.com" : "http://localhost:4000");

const AI_COPILOT_URL =
  process.env.AI_COPILOT_URL ?? "http://localhost:8100";

const config: NextConfig = {
  typedRoutes: true,
  async rewrites() {
    return [
      // ── AI Co-pilot endpoints → Python service ────────────────────
      {
        source: "/api/ai/:path*",
        destination: `${AI_COPILOT_URL}/v1/ai/:path*`,
      },
      // ── Infrastructure AI engines → Python service ────────────────
      {
        source: "/api/infrastructure/ai/:path*",
        destination: `${AI_COPILOT_URL}/v1/infra/:path*`,
      },
      // ── Governance/Compliance route aliases → /compliance/* ────────
      {
        source: "/governance/compliance/:path*",
        destination: "/compliance/:path*",
      },
      {
        source: "/governance/compliance",
        destination: "/compliance",
      },
      // ── Everything else → NestJS core-api ─────────────────────────
      { source: "/api/:path*", destination: `${CORE_API_URL}/api/:path*` },
    ];
  },
};

export default config;
