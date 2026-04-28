import { getDb } from "@/lib/mongodb";
import type { NextRequest } from "next/server";

type RateLimitConfig = {
  maxRequests: number;
  windowInSeconds: number;
};

export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig = { maxRequests: 10, windowInSeconds: 60 }
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip") || "anonymous";
  const key = `rate-limit:ai:${ip}`;

  const windowExpiry = new Date(Date.now() + config.windowInSeconds * 1000);

  const db = await getDb();
  const col = db.collection<{ _id: string; count: number; expiresAt: Date }>("rate_limits");

  const result = await col.findOneAndUpdate(
    { _id: key },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: windowExpiry },
    },
    { upsert: true, returnDocument: "after" }
  );

  const count = result?.count ?? 1;
  const expiresAt = result?.expiresAt ?? windowExpiry;
  const reset = Math.floor(expiresAt.getTime() / 1000);
  const remaining = Math.max(0, config.maxRequests - count);

  return {
    success: count <= config.maxRequests,
    limit: config.maxRequests,
    remaining,
    reset,
  };
}
