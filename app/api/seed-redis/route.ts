import { marketData as fallbackData } from "@/components/bloomberg/lib/marketData";
import { fetchAllMarketData, generateRandomSparkline } from "@/lib/alpha-vantage";
import { getDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import type { MarketData } from "@/components/bloomberg/types";

export async function GET() {
  try {
    console.log("Seeding database with market data...");

    let marketData: MarketData;
    try {
      marketData = await fetchAllMarketData();
      const totalIndices =
        marketData.americas.length + marketData.emea.length + marketData.asiaPacific.length;
      if (totalIndices < 5) {
        throw new Error("Not enough data received from Alpha Vantage");
      }
    } catch (error) {
      console.warn("Error fetching from Alpha Vantage, using fallback data:", error);
      marketData = Object.keys(fallbackData).reduce(
        (acc: MarketData, key: string) => {
          if (key === "americas" || key === "emea" || key === "asiaPacific") {
            acc[key] = fallbackData[key].map((item) => ({
              id: item.id || `item-${Math.random().toString(36).substring(2, 9)}`,
              num: item.num || "",
              rmi: item.rmi || "",
              value: item.value || 0,
              change: item.change || 0,
              pctChange: item.pctChange || 0,
              avat: item.avat || 0,
              time: item.time || new Date().toLocaleTimeString(),
              ytd: item.ytd || 0,
              ytdCur: item.ytdCur || 0,
              sparkline1: generateRandomSparkline(),
              sparkline2: generateRandomSparkline(),
            }));
          }
          return acc;
        },
        { ...fallbackData } as MarketData
      );
    }

    const dataWithTimestamp = { ...marketData, lastUpdated: new Date().toISOString() };

    try {
      const db = await getDb();
      await db.collection("market_data").replaceOne(
        { _id: "singleton" as unknown as never },
        { ...dataWithTimestamp, expiresAt: new Date(Date.now() + 3600 * 1000) },
        { upsert: true }
      );
      console.log("Data successfully stored in MongoDB");
    } catch (dbError) {
      console.error("Error storing data in MongoDB:", dbError);
    }

    return NextResponse.json({
      success: true,
      message: "Market data processed successfully!",
      timestamp: new Date().toISOString(),
      source: marketData.dataSource || "fallback",
    });
  } catch (error) {
    console.error("Error in seed-db route:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process market data", details: String(error), fallbackUsed: true },
      { status: 200 }
    );
  }
}
