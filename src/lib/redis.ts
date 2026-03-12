import { createClient, RedisClientType } from 'redis';
import type { SessionData, UserData } from '@/types';

const REDIS_URL = 'redis://default:top3Xic4i5HET8ZmNZWdMe5yv88fq5SY@redis-10834.crce207.sa-east-1-2.ec2.cloud.redislabs.com:10834';

const SESSION_TTL = 3600;      // 1 hour
const USER_DATA_TTL = 86400;   // 24 hours

declare global {
  // eslint-disable-next-line no-var
  var __redisClient: RedisClientType | undefined;
}

async function getRedis(): Promise<RedisClientType> {
  if (global.__redisClient && global.__redisClient.isOpen) {
    return global.__redisClient;
  }

  const client = createClient({ url: REDIS_URL }) as RedisClientType;

  client.on('error', (err) => {
    console.error('[Redis] Client error:', err);
  });

  await client.connect();
  global.__redisClient = client;
  return client;
}

export async function saveSession(data: SessionData): Promise<void> {
  const redis = await getRedis();
  await redis.setEx(
    `session:${data.visitorId}`,
    SESSION_TTL,
    JSON.stringify(data)
  );
}

export async function getSession(visitorId: string): Promise<SessionData | null> {
  const redis = await getRedis();
  const raw = await redis.get(`session:${visitorId}`);
  if (!raw) return null;
  return JSON.parse(raw) as SessionData;
}

export async function updateSession(
  visitorId: string,
  updates: Partial<SessionData>
): Promise<void> {
  const redis = await getRedis();
  const existing = await getSession(visitorId);
  if (!existing) return;
  const updated = { ...existing, ...updates };
  await redis.setEx(
    `session:${visitorId}`,
    SESSION_TTL,
    JSON.stringify(updated)
  );
}

export async function saveUserData(visitorId: string, data: UserData): Promise<void> {
  const redis = await getRedis();
  await redis.setEx(
    `userdata:${visitorId}`,
    USER_DATA_TTL,
    JSON.stringify(data)
  );
}

export async function getUserData(visitorId: string): Promise<UserData | null> {
  const redis = await getRedis();
  const raw = await redis.get(`userdata:${visitorId}`);
  if (!raw) return null;
  return JSON.parse(raw) as UserData;
}

export { getRedis };
