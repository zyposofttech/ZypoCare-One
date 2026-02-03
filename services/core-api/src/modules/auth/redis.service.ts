import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

type RedisClient = Redis;

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClient | null = null;
  private readonly prefix: string;

  constructor() {
    // Allow disabling Redis entirely
    const url = process.env.REDIS_URL || process.env.CACHE_REDIS_URL || "";
    this.prefix = (process.env.REDIS_PREFIX || "zc:").trim();

    if (!url) {
      // No Redis configured: operate as a no-op.
      return;
    }

    try {
      this.client = new Redis(url, {
        maxRetriesPerRequest: 2,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      // Fire-and-forget connection (do not block boot)
      void this.client
        .connect()
        .then(() => this.logger.log("Redis connected"))
        .catch((e) => {
          this.logger.warn(`Redis connect failed; continuing without redis cache: ${e?.message || e}`);
          this.client = null;
        });
    } catch (e: any) {
      this.logger.warn(`Redis init failed; continuing without redis cache: ${e?.message || e}`);
      this.client = null;
    }
  }

  isEnabled() {
    return !!this.client;
  }

  key(raw: string) {
    // Namespacing prevents collisions when multiple apps share same Redis.
    return `${this.prefix}${raw}`;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(this.key(key));
    } catch {
      return null;
    }
  }

  async setPx(key: string, value: string, ttlMs: number): Promise<void> {
    if (!this.client) return;
    const ms = Math.max(1, Number(ttlMs || 0));
    try {
      await this.client.set(this.key(key), value, "PX", ms);
    } catch {
      // ignore
    }
  }

  async setEx(key: string, value: string, ttlSec: number): Promise<void> {
    if (!this.client) return;
    const sec = Math.max(1, Number(ttlSec || 0));
    try {
      await this.client.set(this.key(key), value, "EX", sec);
    } catch {
      // ignore
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(this.key(key));
    } catch {
      // ignore
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const n = await this.client.exists(this.key(key));
      return n > 0;
    } catch {
      return false;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: any, ttlMs: number): Promise<void> {
    try {
      const raw = JSON.stringify(value);
      await this.setPx(key, raw, ttlMs);
    } catch {
      // ignore
    }
  }

  // ---------------------
  // Optional token revocation (jti)
  // ---------------------

  revokedJtiKey(jti: string) {
    return `auth:revoked:jti:${String(jti || "").trim()}`;
  }

  async isJtiRevoked(jti: string): Promise<boolean> {
    if (!jti) return false;
    return this.exists(this.revokedJtiKey(jti));
  }

  async revokeJti(jti: string, ttlSec: number): Promise<void> {
    if (!jti) return;
    // Store a marker; TTL matches remaining token lifetime.
    await this.setEx(this.revokedJtiKey(jti), "1", ttlSec);
  }

  async onModuleDestroy() {
    try {
      await this.client?.quit();
    } catch {
      // ignore
    }
    this.client = null;
  }
}
