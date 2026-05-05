import { createClient } from "redis";

const globalForRedis = global as unknown as { redisClient: ReturnType<typeof createClient> };

export const redisClient = globalForRedis.redisClient || createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379"
});

if (process.env.NODE_ENV !== "production") globalForRedis.redisClient = redisClient;

redisClient.on("error", (err) => console.error("Redis Client Error", err));

let isConnected = false;

async function connect() {
  return false; // TEMPORARILY DISABLED TO FIX HANGING
  if (process.env.REDIS_ENABLED === "false") return false;
  
  // Check if already open to avoid "Socket already opened" error
  if (redisClient.isOpen) {
    isConnected = true;
    return true;
  }

  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Redis connection timeout")), 2000)
    );
    
    await Promise.race([
      redisClient.connect(),
      timeoutPromise
    ]);
    
    isConnected = true;
    return true;
  } catch (error: any) {
    // If it's already opened, we're good
    if (error.message?.includes("already opened")) {
      isConnected = true;
      return true;
    }
    console.error("Failed to connect to Redis:", error);
    isConnected = false;
    return false;
  }
}

export async function setCache(key: string, value: any, ttlSeconds: number = 3600) {
  try {
    const connected = await connect();
    if (!connected) return;
    
    await redisClient.set(key, JSON.stringify(value), {
      EX: ttlSeconds
    });
  } catch (error) {
    console.error("Redis setCache error", error);
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const connected = await connect();
    if (!connected) return null;

    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Redis getCache error", error);
    return null;
  }
}

export async function delCache(key: string) {
  try {
    const connected = await connect();
    if (!connected) return;

    await redisClient.del(key);
  } catch (error) {
    console.error("Redis delCache error", error);
  }
}
