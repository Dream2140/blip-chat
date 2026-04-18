import Redis from "ioredis";
import { RedisChannels } from "@chat-app/shared";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis = globalForRedis.redis ?? new Redis(REDIS_URL);

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export async function publishMessageEvent(
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  await redis.publish(
    RedisChannels.MESSAGE_EVENTS,
    JSON.stringify({ event, data })
  );
}
