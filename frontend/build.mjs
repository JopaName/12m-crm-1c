
import crypto from "crypto";
globalThis.crypto = crypto.webcrypto;
const { build } = await import("vite");
await build();

