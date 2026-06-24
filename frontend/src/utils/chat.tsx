function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
}

function formatFullTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getInitials(u: { firstName: string; lastName: string }) {
  return (u.firstName?.[0] || "") + (u.lastName?.[0] || "");
}

const COLORS = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-pink-500",
  "bg-indigo-500", "bg-teal-500", "bg-orange-500", "bg-cyan-500",
];

function Avatar({ user, size = "md" }: { user: { firstName: string; lastName: string }; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-lg" };
  const colorIdx = (user.firstName?.length || 0) % COLORS.length;
  return (
    <div className={`${sizes[size]} ${COLORS[colorIdx]} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {getInitials(user)}
    </div>
  );
}

function formatMessageDateSeparator(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return "Today";
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" });
}

function FilePreview({ msg }: { msg: ChatMessage }) {
  const isImage = msg.mimeType?.startsWith("image/");
  if (isImage) {
    return (
      <a href={msg.fileUrl!} target="_blank" rel="noopener noreferrer" className="block max-w-xs">
        <img src={msg.fileUrl!} alt={msg.fileName || ""} className="rounded-lg max-h-60 object-cover" />
      </a>
    );
  }
  return (
    <a
      href={msg.fileUrl!}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-sm hover:bg-gray-200 transition-colors"
    >
      <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      <div className="min-w-0">
        <div className="text-gray-800 font-medium truncate">{msg.fileName}</div>
        <div className="text-gray-400 text-xs">{formatFileSize(msg.fileSize || 0)}</div>
      </div>
    </a>
  );
}

function usePrevious<T>(value: T) {
  const ref = useRef<T>(value);
  useEffect(() => { ref.current = value; }, [value]);
  return ref.current;
}

export { formatTime, formatFullTime, formatFileSize, getInitials, COLORS, Avatar, formatMessageDateSeparator, FilePreview, usePrevious };
