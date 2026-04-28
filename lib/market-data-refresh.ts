import { fetchAllMarketData } from "./alpha-vantage";
import { getDb } from "./mongodb";
import scheduler from "./scheduler";

export async function refreshMarketData(): Promise<void> {
  try {
    console.log("Starting market data refresh from Alpha Vantage...");

    const db = await getDb();
    const col = db.collection("market_data");
    const existingData = await col.findOne({ _id: "singleton" as unknown as never });

    if (!existingData || shouldRefreshData(existingData as { lastFullRefresh?: string })) {
      const marketData = await fetchAllMarketData();
      const totalIndices =
        marketData.americas.length + marketData.emea.length + marketData.asiaPacific.length;

      if (totalIndices < 5) {
        throw new Error("Not enough data received from Alpha Vantage");
      }

      const now = new Date();
      await col.replaceOne(
        { _id: "singleton" as unknown as never },
        {
          ...marketData,
          lastUpdated: now.toISOString(),
          lastFullRefresh: now.toISOString(),
          expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        },
        { upsert: true }
      );

      console.log("Market data successfully refreshed and stored in MongoDB");
      return;
    }

    console.log("Recent market data found in MongoDB, skipping refresh");
  } catch (error) {
    console.error("Error refreshing market data:", error);
    throw error;
  }
}

function shouldRefreshData(data: { lastFullRefresh?: string }): boolean {
  if (!data.lastFullRefresh) return true;
  const hoursSinceLastRefresh = (Date.now() - new Date(data.lastFullRefresh).getTime()) / (1000 * 60 * 60);
  return hoursSinceLastRefresh > 23;
}

scheduler.register(
  "market-data-refresh",
  "Alpha Vantage Market Data Refresh",
  24,
  refreshMarketData
);

export default refreshMarketData;
