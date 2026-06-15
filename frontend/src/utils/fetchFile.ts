const API_BASE = "";

export interface FileFetchResult {
  blob: Blob;
  mimeType: string;
  fileName: string;
  fileSize: number;
}

export class AppFileError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = "AppFileError";
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function handleAuthFailure(): void {
  localStorage.removeItem("token");
  var currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
  window.location.href = "/login?redirect=" + encodeURIComponent(currentPath);
}

function getFileNameFromDisposition(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  var match = disposition.match(/filename\*?=(?:UTF-8'')?([^;\s]+)/i);
  if (match) return decodeURIComponent(match[1].trim());
  match = disposition.match(/filename="?([^";]+)"?/i);
  if (match) return match[1].trim();
  return fallback;
}

export async function fetchFileWithAuth(url: string): Promise<FileFetchResult> {
  var token = getToken();
  if (!token) {
    handleAuthFailure();
    throw new AppFileError("Not authenticated", 401);
  }

  var response = await fetch(url, {
    headers: { Authorization: "Bearer " + token },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new AppFileError("Session expired", 401);
  }

  if (!response.ok) {
    throw new AppFileError("Failed to fetch file: " + response.statusText, response.status);
  }

  var contentType = response.headers.get("Content-Type") || "application/octet-stream";
  var contentDisposition = response.headers.get("Content-Disposition");
  var contentLengthStr = response.headers.get("Content-Length");
  var contentLength = contentLengthStr ? parseInt(contentLengthStr, 10) : 0;

  var blob = await response.blob();
  var fileName = getFileNameFromDisposition(contentDisposition, "file");

  return {
    blob,
    mimeType: contentType,
    fileName: fileName,
    fileSize: contentLength || blob.size,
  };
}

export const UNSAFE_PREVIEW_EXTENSIONS = [
  "html", "htm", "js", "jsx", "ts", "tsx", "svg", "xml",
  "php", "phtml", "php3", "php4", "php5", "pht",
  "asp", "aspx", "jsp", "cfm", "shtml",
  "wasm", "swf",
] as readonly string[];

export const UNSAFE_PREVIEW_MIME_PREFIXES = [
  "text/html", "text/javascript", "application/javascript",
  "application/x-javascript", "text/ecmascript", "application/ecmascript",
  "image/svg+xml", "application/xml", "text/xml",
  "application/x-httpd-php",
] as readonly string[];

export function isUnsafePreview(mimeType: string, fileName: string): boolean {
  var ext = getFileExtension(fileName);
  if (UNSAFE_PREVIEW_EXTENSIONS.includes(ext as any)) return true;
  for (var prefix of UNSAFE_PREVIEW_MIME_PREFIXES) {
    if (mimeType.startsWith(prefix)) return true;
  }
  return false;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 ??";
  var units = ["??", "????", "????", "????"];
  var i = Math.floor(Math.log(bytes) / Math.log(1024));
  if (i >= units.length) i = units.length - 1;
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + " " + units[i];
}

export function getFileExtension(fileName: string): string {
  var parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

export type FileCategory = "image" | "pdf" | "docx" | "xlsx" | "text" | "video" | "audio" | "archive" | "other";

export function categorizeFile(mimeType: string, fileName: string): FileCategory {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "xlsx";
  if (mimeType.includes("word") || mimeType.includes("document")) return "docx";
  if (mimeType.startsWith("text/")) return "text";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z") || mimeType.includes("tar") || mimeType.includes("gzip")) return "archive";
  var ext = getFileExtension(fileName);
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "avif"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext)) return "docx";
  if (["xls", "xlsx", "csv"].includes(ext)) return "xlsx";
  if (["txt", "json", "xml", "md", "yaml", "yml", "ini", "cfg", "log", "csv"].includes(ext)) return "text";
  if (["zip", "rar", "7z", "tar", "gz", "bz2", "xz"].includes(ext)) return "archive";
  return "other";
}
