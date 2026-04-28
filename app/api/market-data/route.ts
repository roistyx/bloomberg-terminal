import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:3001";

async function backendFetch(path: string, init?: RequestInit) {
  return fetch(`${BACKEND}${path}`, init);
}

export async function GET() {
  try {
    const res = await backendFetch("/api/market-data");
    if (!res.ok) throw new Error(`Backend responded ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/market-data proxy error:", err);
    return NextResponse.json({ error: "Failed to load market data" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await backendFetch("/api/market-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (err) {
    console.error("POST /api/market-data proxy error:", err);
    return NextResponse.json({ success: false, error: "Failed to update market data" }, { status: 502 });
  }
}
