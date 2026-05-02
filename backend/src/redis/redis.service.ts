import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);
  private connected = false;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: () => null, // don't retry — gracefully degrade
    });

    this.client.on('connect', () => {
      this.connected = true;
      this.logger.log('Redis connected');
    });

    this.client.on('error', (err) => {
      this.connected = false;
      this.logger.warn(`Redis unavailable: ${err.message} — caching disabled`);
    });

    this.client.connect().catch(() => {});
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.connected) return null;
    try {
      const val = await this.client.get(key);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {}
  }

  async del(key: string): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.del(key);
    } catch {}
  }

  async delByPattern(pattern: string): Promise<void> {
    if (!this.connected) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length) await this.client.del(...keys);
    } catch {}
  }

  async setRefreshToken(userId: string, ttlSeconds: number): Promise<void> {
    await this.set(`refresh:${userId}`, '1', ttlSeconds);
  }

  async hasRefreshToken(userId: string): Promise<boolean> {
    const val = await this.get(`refresh:${userId}`);
    return val !== null;
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    await this.del(`refresh:${userId}`);
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
