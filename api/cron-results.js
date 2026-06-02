import { cronResults } from "./cron.js";

export default function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowed = [process.env.ALLOWED_ORIGIN || "https://deniskyla-auto.vercel.app", "http://localhost:5173", "http://localhost:5174"];
  if (origin && !allowed.includes(origin)) return res.status(403).json({ error: "Forbidden" });
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.json({ results: cronResults });
}
