import { RedisChannels } from "@chat-app/shared";

const REDIS_URL = process.env.REDIS_URL;

let redisClient: import("ioredis").default | null = null;

async function getRedis(): Promise<import("ioredis").default | null> {
  if (!REDIS_URL) return null;
  if (redisClient) return redisClient;

  const { default: Redis } = await import("ioredis");

  const globalForRedis = globalThis as unknown as {
    redis: import("ioredis").default | undefined;
  };

  if (globalForRedis.redis) {
    redisClient = globalForRedis.redis;
    return redisClient;
  }

  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  redisClient.on("error", () => {
    // Silently handle Redis errors — app works without it
  });

  if (process.env.NODE_ENV !== "production") {
    globalForRedis.redis = redisClient;
  }

  return redisClient;
}

export async function publishMessageEvent(
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const redis = await getRedis();
    if (!redis) return; // No Redis — skip publishing
    await redis.publish(
      RedisChannels.MESSAGE_EVENTS,
      JSON.stringify({ event, data })
    );
  } catch {
    // Redis unavailable — messages still saved to DB, just no real-time push
  }
}
