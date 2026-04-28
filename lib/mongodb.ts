import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGODB_DB || "bloomberg";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

const client = global._mongoClient ?? new MongoClient(uri);

if (process.env.NODE_ENV !== "production") {
  global._mongoClient = client;
}

let indexesCreated = false;

async function ensureIndexes(database: Db) {
  if (indexesCreated) return;
  await database.collection("rate_limits").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, background: true }
  );
  indexesCreated = true;
}

export async function getDb(): Promise<Db> {
  await client.connect();
  const database = client.db(dbName);
  await ensureIndexes(database);
  return database;
}
