import dotenv from 'dotenv';
dotenv.config();

function required(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error('Missing required environment variable: ' + name);
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
  port: optionalInt('PORT', 3000),
  nodeEnv: optional('NODE_ENV', 'development'),
  isProd: optional('NODE_ENV', 'development') === 'production',

  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: optional('JWT_EXPIRES_IN', '24h'),
  },

  cors: {
    origin: (() => {
      if (optional('NODE_ENV', 'development') === 'production') {
        return required('CORS_ORIGIN');
      }
      return optional('CORS_ORIGIN', '*');
    })(),
  },

  database: {
    url: required('DATABASE_URL'),
  },

  rateLimit: {
    auth: { windowMs: 15 * 60 * 1000, max: 20 },
    api: { windowMs: 60 * 1000, max: 200 },
  },

  cache: {
    defaultTTL: optionalInt('CACHE_TTL_SECONDS', 300),
    enabled: optional('CACHE_ENABLED', 'true') === 'true',
  },

  upload: {
    dir: optional('UPLOAD_DIR', 'uploads'),
    maxSize: optionalInt('UPLOAD_MAX_SIZE', 50 * 1024 * 1024),
    maxFilesPerEntity: optionalInt('UPLOAD_MAX_FILES_PER_ENTITY', 20),
    allowedExtensions: optional('UPLOAD_ALLOWED_EXTENSIONS', '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar,.7z'),
    unsafePreviewMime: [
      'text/html', 'text/javascript', 'application/javascript',
      'application/x-javascript', 'text/ecmascript', 'application/ecmascript',
      'image/svg+xml', 'application/xml', 'text/xml',
      'application/x-httpd-php',
    ] as readonly string[],
  },
} as const;

export type Config = typeof config;
