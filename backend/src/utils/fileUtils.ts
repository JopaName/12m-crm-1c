import path from "path";

const CYRILLIC_MAP: Record<string, string> = {
  "\u0430":"a","\u0431":"b","\u0432":"v","\u0433":"g","\u0434":"d","\u0435":"e","\u0451":"yo",
  "\u0436":"zh","\u0437":"z","\u0438":"i","\u0439":"y","\u043a":"k","\u043b":"l","\u043c":"m",
  "\u043d":"n","\u043e":"o","\u043f":"p","\u0440":"r","\u0441":"s","\u0442":"t","\u0443":"u",
  "\u0444":"f","\u0445":"kh","\u0446":"ts","\u0447":"ch","\u0448":"sh","\u0449":"shch",
  "\u044a":"","\u044b":"y","\u044c":"","\u044d":"e","\u044e":"yu","\u044f":"ya",
  "\u0410":"A","\u0411":"B","\u0412":"V","\u0413":"G","\u0414":"D","\u0415":"E","\u0401":"Yo",
  "\u0416":"Zh","\u0417":"Z","\u0418":"I","\u0419":"Y","\u041a":"K","\u041b":"L","\u041c":"M",
  "\u041d":"N","\u041e":"O","\u041f":"P","\u0420":"R","\u0421":"S","\u0422":"T","\u0423":"U",
  "\u0424":"F","\u0425":"Kh","\u0426":"Ts","\u0427":"Ch","\u0428":"Sh","\u0429":"Shch",
  "\u042a":"","\u042b":"Y","\u042c":"","\u042d":"E","\u042e":"Yu","\u042f":"Ya",
};

export function sanitizeFilename(name: string): string {
  let result = "";
  for (const ch of name) {
    result += CYRILLIC_MAP[ch] || ch;
  }
  result = result.replace(/[<>:"\/\\|?*\x00-\x1f]/g, "_");
  result = result.replace(/\s+/g, " ").trim();
  if (result.length > 200) {
    const ext = path.extname(result);
    result = result.slice(0, 200 - ext.length) + ext;
  }
  return result || "unnamed";
}

export function isAllowedMimeType(mimeType: string): boolean {
  return [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "application/zip", "application/x-rar-compressed",
  ].includes(mimeType);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
