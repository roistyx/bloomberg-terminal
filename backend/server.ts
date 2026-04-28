import express from "express";
import { MongoClient, type Db } from "mongodb";
import { generateRandomSparkline, fetchAllMarketData } from "../lib/alpha-vantage";
import { marketData as fallbackData } from "../components/bloomberg/lib/marketData";
import type { MarketData, MarketItem } from "../components/bloomberg/types";

const PORT = Number(process.env.BACKEND_PORT) || 3001;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB || "bloomberg";
const SPARKLINE_UPDATE_INTERVAL = 5 * 60 * 1000;

// MongoDB singleton
let db: Db;
async function getDb(): Promise<Db> {
  if (!db) {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    await setupIndexes(db);
    console.log("Connected to MongoDB");
  }
  return db;
}

async function setupIndexes(database: Db) {
  // TTL index: auto-delete market_data documents after expiresAt
  await database.collection("market_data").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, background: true }
  );
}

// Year-start cache for YTD calculations (in-memory, repopulated from stored data)
const yearStartValues: Record<string, number> = {};

function initializeYearStartValues(data: MarketData) {
  if (Object.keys(yearStartValues).length === 0) {
    for (const region of ["americas", "emea", "asiaPacific"] as const) {
      for (const item of data[region]) {
        if (typeof item.value === "number" && typeof item.ytd === "number") {
          yearStartValues[item.id] = item.value / (1 + item.ytd / 100);
        } else {
          yearStartValues[item.id] = item.value * 0.9;
        }
      }
    }
  }
}

function getEnhancedFallbackData(): MarketData {
  const now = new Date().toISOString();
  const result = { ...fallbackData } as MarketData;
  for (const region of ["americas", "emea", "asiaPacific"] as const) {
    result[region] = fallbackData[region].map((item) => ({
      id: item.id || `item-${Math.random().toString(36).substring(2, 9)}`,
      num: item.num || "",
      rmi: item.rmi || "",
      value: item.value || 0,
      change: item.change || 0,
      pctChange: item.pctChange || 0,
      avat: item.avat || 0,
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
      ytd: item.ytd || 0,
      ytdCur: item.ytdCur || 0,
      sparkline1: generateRandomSparkline(),
      sparkline2: generateRandomSparkline(),
      lastUpdated: now,
      sparklineUpdated: now,
    }));
  }
  result.lastSparklineUpdate = now;
  return result;
}

async function generateRandomUpdates(data: MarketData): Promise<MarketData> {
  initializeYearStartValues(data);

  const marketSentiment = Math.random() * 2 - 1;
  const regionFactors = {
    americas: marketSentiment * 0.7 + (Math.random() * 0.6 - 0.3),
    emea: marketSentiment * 0.7 + (Math.random() * 0.6 - 0.3),
    asiaPacific: marketSentiment * 0.7 + (Math.random() * 0.6 - 0.3),
  };

  const currentTime = Date.now();
  const lastSparklineUpdate = data.lastSparklineUpdate
    ? new Date(data.lastSparklineUpdate as string).getTime()
    : currentTime - SPARKLINE_UPDATE_INTERVAL - 1;
  const shouldUpdateSparklines = currentTime - lastSparklineUpdate >= SPARKLINE_UPDATE_INTERVAL;

  const updatedData = { ...data } as MarketData;

  for (const region of ["americas", "emea", "asiaPacific"] as const) {
    updatedData[region] = (data[region] as MarketItem[]).map((item) => {
      try {
        const regionFactor = regionFactors[region];
        const individualFactor = Math.random() * 0.8 - 0.4;
        const combinedFactor = marketSentiment * 0.4 + regionFactor * 0.4 + individualFactor * 0.2;

        let volatilityMultiplier = 1.0;
        if (item.id.includes("IBOVESPA") || item.id.includes("HANG SENG") || item.id.includes("CSI 300")) {
          volatilityMultiplier = 1.5;
        } else if (item.id.includes("S&P 500") || item.id.includes("DOW JONES")) {
          volatilityMultiplier = 0.8;
        }

        const changePercent = combinedFactor * 0.2 * volatilityMultiplier;
        const newChange = item.value * (changePercent / 100);
        const newValue = item.value + newChange;
        const cumulativeChange = item.change + newChange;
        const newPctChange = (cumulativeChange / (item.value - item.change)) * 100;

        const currentHour = new Date().getHours();
        const volumeMultiplier = currentHour < 10 || currentHour > 15 ? 1.5 : 1.0;
        const newAvat = item.avat + (Math.random() * 2 - 1) * volumeMultiplier;

        const yearStartValue = yearStartValues[item.id];
        const newYtd = ((newValue - yearStartValue) / yearStartValue) * 100;
        const currencyFactor = 1 + (Math.random() * 0.1 - 0.05);
        const newYtdCur = newYtd * currencyFactor;

        let sparkline1 = item.sparkline1 || generateRandomSparkline();
        let sparkline2 = item.sparkline2 || generateRandomSparkline();
        let sparklineUpdated = item.sparklineUpdated || new Date().toISOString();

        if (shouldUpdateSparklines) {
          sparkline1 = [
            ...sparkline1.slice(1),
            Math.min(1, Math.max(0, sparkline1[sparkline1.length - 1] + (Math.random() * 0.2 - 0.1))),
          ];
          sparkline2 = [
            ...sparkline2.slice(1),
            Math.min(1, Math.max(0, sparkline2[sparkline2.length - 1] + (Math.random() * 0.2 - 0.1))),
          ];
          sparklineUpdated = new Date().toISOString();
        }

        return {
          ...item,
          value: Number.parseFloat(newValue.toFixed(2)),
          change: Number.parseFloat(cumulativeChange.toFixed(2)),
          pctChange: Number.parseFloat(newPctChange.toFixed(2)),
          avat: Number.parseFloat(newAvat.toFixed(2)),
          time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
          ytd: Number.parseFloat(newYtd.toFixed(2)),
          ytdCur: Number.parseFloat(newYtdCur.toFixed(2)),
          sparkline1,
          sparkline2,
          sparklineUpdated,
          lastUpdated: new Date().toISOString(),
        };
      } catch {
        return {
          ...item,
          sparkline1: item.sparkline1 || generateRandomSparkline(),
          sparkline2: item.sparkline2 || generateRandomSparkline(),
          time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
          lastUpdated: new Date().toISOString(),
        };
      }
    });
  }

  updatedData.lastSparklineUpdate = shouldUpdateSparklines
    ? new Date().toISOString()
    : (data.lastSparklineUpdate as string) || new Date().toISOString();

  return updatedData;
}

const app = express();
app.use(express.json());

app.get("/api/market-data", async (_req, res) => {
  try {
    const database = await getDb();
    const doc = await database.collection("market_data").findOne({ _id: "singleton" as unknown as never });

    if (!doc) {
      const fallback = getEnhancedFallbackData();
      initializeYearStartValues(fallback);
      return res.json({ ...fallback, fromDb: false, lastUpdated: new Date().toISOString() });
    }

    const { _id, expiresAt, ...data } = doc;
    initializeYearStartValues(data as unknown as MarketData);
    return res.json({ ...data, fromDb: true, lastFetched: new Date().toISOString() });
  } catch (err) {
    console.error("GET /api/market-data error:", err);
    const fallback = getEnhancedFallbackData();
    initializeYearStartValues(fallback);
    return res.json({ ...fallback, fromDb: false, lastUpdated: new Date().toISOString() });
  }
});

app.post("/api/market-data", async (req, res) => {
  try {
    const { action } = req.body as { action: string };

    if (action !== "update") {
      return res.status(400).json({ error: "Invalid action" });
    }

    const database = await getDb();
    const col = database.collection("market_data");
    const doc = await col.findOne({ _id: "singleton" as unknown as never });

    let currentData: MarketData;
    if (doc) {
      const { _id, expiresAt, ...rest } = doc;
      currentData = rest as unknown as MarketData;
    } else {
      currentData = getEnhancedFallbackData();
    }

    const updatedData = await generateRandomUpdates(currentData);
    updatedData.lastUpdated = new Date().toISOString();

    await col.replaceOne(
      { _id: "singleton" as unknown as never },
      {
        ...updatedData,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
      { upsert: true }
    );

    return res.json({ success: true, message: "Market data updated successfully" });
  } catch (err) {
    console.error("POST /api/market-data error:", err);
    return res.status(200).json({ success: false, error: "Failed to process request", details: String(err) });
  }
});

// Seed endpoint: fetch from Alpha Vantage and store in MongoDB
app.post("/api/seed", async (_req, res) => {
  try {
    let marketData: MarketData;
    try {
      marketData = await fetchAllMarketData() as unknown as MarketData;
      const total = marketData.americas.length + marketData.emea.length + marketData.asiaPacific.length;
      if (total < 5) throw new Error("Not enough data from Alpha Vantage");
    } catch (err) {
      console.warn("Alpha Vantage fetch failed, using fallback:", err);
      marketData = getEnhancedFallbackData();
    }

    const dataWithTimestamp = { ...marketData, lastUpdated: new Date().toISOString() };
    const database = await getDb();
    await database.collection("market_data").replaceOne(
      { _id: "singleton" as unknown as never },
      { ...dataWithTimestamp, expiresAt: new Date(Date.now() + 3600 * 1000) },
      { upsert: true }
    );

    return res.json({
      success: true,
      message: "Market data seeded successfully",
      timestamp: new Date().toISOString(),
      source: marketData.dataSource || "fallback",
    });
  } catch (err) {
    console.error("POST /api/seed error:", err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Bloomberg backend listening on http://localhost:${PORT}`);
});
