import type { VercelRequest, VercelResponse } from "@vercel/node";

// Regional metadata supplied by Vercel's trusted proxy, not visitor GPS.
// Neither IP address nor precise coordinates are returned or stored.
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const value = (name: string, max: number) => {
    const raw = req.headers[name];
    return typeof raw === "string" ? raw.slice(0, max) : null;
  };
  return res.status(200).json({
    city: value("x-vercel-ip-city", 100),
    region: value("x-vercel-ip-country-region", 100),
    country: value("x-vercel-ip-country", 2)
  });
}
