import dotenv from "dotenv";
dotenv.config();

function required(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

function optionalInt(name: string, fallback: number): number {
  const val = process.env[name];
  return val ? parseInt(val, 10) : fallback;
}

export const config = {
  port: optionalInt("PORT", 3000),
  nodeEnv: optional("NODE_ENV", "development"),
  isProd: optional("NODE_ENV", "development") === "production",

  jwt: {
    secret: required("JWT_SECRET"),
    expiresIn: optional("JWT_EXPIRES_IN", "24h"),
  },

  cors: {
    origin: (() => {
      if (optional("NODE_ENV", "development") === "production") {
        return required("CORS_ORIGIN");
      }
      return optional("CORS_ORIGIN", "*");
    })(),
  },

  database: {
    url: required("DATABASE_URL"),
  },

  rateLimit: {
    auth: { windowMs: 15 * 60 * 1000, max: 20 },
    api: { windowMs: 60 * 1000, max: 200 },
  },

  cache: {
    defaultTTL: optionalInt("CACHE_TTL_SECONDS", 300),
    enabled: optional("CACHE_ENABLED", "true") === "true",
  },

  upload: {
    dir: optional("UPLOAD_DIR", "uploads"),
    maxSize: optionalInt("UPLOAD_MAX_SIZE", 50 * 1024 * 1024),
  },
} as const;

export type Config = typeof config;
