import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { Redis } from "@upstash/redis";

import { type ContentKey, type SiteContent } from "@/lib/types";

const defaultsDirPath = path.join(process.cwd(), "data", "defaults");

type StorageMode = "auto" | "redis" | "json";
type StorageBackend = "redis" | "json";

function hasRedisEnv() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function createRedisClient() {
  if (!hasRedisEnv()) {
    return null;
  }

  try {
    return Redis.fromEnv();
  } catch {
    return null;
  }
}

const redis = createRedisClient();

function redisKey(key: ContentKey) {
  return `content:${key}`;
}

function getStorageMode(): StorageMode {
  const mode = process.env.CONTENT_STORAGE_MODE?.toLowerCase();
  if (mode === "redis" || mode === "json" || mode === "auto") {
    return mode;
  }

  return "auto";
}

function resolveStorageBackend(): StorageBackend {
  const mode = getStorageMode();
  if (mode === "json") {
    return "json";
  }

  if (mode === "redis") {
    if (!redis) {
      throw new Error('CONTENT_STORAGE_MODE is "redis" but Redis is not configured.');
    }

    return "redis";
  }

  return redis ? "redis" : "json";
}

function defaultFilePath(key: ContentKey): string {
  return path.join(defaultsDirPath, `${key}.json`);
}

async function readDefaultFile<K extends ContentKey>(key: K): Promise<SiteContent[K]> {
  const filePath = defaultFilePath(key);
  const raw = await readFile(filePath, "utf8");

  try {
    return JSON.parse(raw) as SiteContent[K];
  } catch {
    throw new Error(`Failed to parse data/defaults/${key}.json`);
  }
}

async function writeDefaultFile<K extends ContentKey>(
  key: K,
  value: SiteContent[K]
): Promise<void> {
  const filePath = defaultFilePath(key);
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const payload = `${JSON.stringify(value, null, 2)}\n`;

  await writeFile(tempPath, payload, "utf8");

  try {
    await rename(tempPath, filePath);
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }
}

async function readAllDefaultContent(): Promise<SiteContent> {
  const [hero, milestones, dates, gallery, story, profiles, letter, dreams] = await Promise.all([
    readDefaultFile("hero"),
    readDefaultFile("milestones"),
    readDefaultFile("dates"),
    readDefaultFile("gallery"),
    readDefaultFile("story"),
    readDefaultFile("profiles"),
    readDefaultFile("letter"),
    readDefaultFile("dreams")
  ]);

  return {
    hero,
    milestones,
    dates,
    gallery,
    story,
    profiles,
    letter,
    dreams
  };
}

export async function getContent<K extends ContentKey>(key: K): Promise<SiteContent[K]> {
  const backend = resolveStorageBackend();

  if (backend === "json") {
    return readDefaultFile(key);
  }

  try {
    const value = await redis!.get<SiteContent[K]>(redisKey(key));
    if (value === null) {
      return readDefaultFile(key);
    }

    return value;
  } catch {
    return readDefaultFile(key);
  }
}

export async function setContent<K extends ContentKey>(key: K, value: SiteContent[K]): Promise<void> {
  const backend = resolveStorageBackend();

  if (backend === "json") {
    await writeDefaultFile(key, value);
    return;
  }

  await redis!.set(redisKey(key), value);
}

export async function getAllContent(): Promise<SiteContent> {
  const backend = resolveStorageBackend();

  if (backend === "json") {
    return readAllDefaultContent();
  }

  const [hero, milestones, dates, gallery, story, profiles, letter, dreams] =
    await Promise.all([
      getContent("hero"),
      getContent("milestones"),
      getContent("dates"),
      getContent("gallery"),
      getContent("story"),
      getContent("profiles"),
      getContent("letter"),
      getContent("dreams")
    ]);

  return {
    hero,
    milestones,
    dates,
    gallery,
    story,
    profiles,
    letter,
    dreams
  };
}
