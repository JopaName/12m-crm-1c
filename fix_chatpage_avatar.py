path = '/root/12m-crm-1c/frontend/src/pages/ChatPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Remove the Avatar import
c = c.replace("import Avatar from \"../components/Avatar\";\n", "")

# Add inline Avatar function after import
old = "export default function ChatPage() {"
new = r'''function Avatar({ user, size = "md" }: { user: any; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-8 h-8 text-xs" : size === "md" ? "w-10 h-10 text-sm" : "w-12 h-12 text-base";
  const initials = ((user?.firstName?.[0] || "") + (user?.lastName?.[0] || "")).toUpperCase() || "?";

  const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
  const colors = ["bg-blue-500","bg-emerald-500","bg-violet-500","bg-amber-500","bg-rose-500","bg-cyan-500","bg-orange-500","bg-teal-500"];
  const idx = (user?.id || 0) % colors.length;
  return <div className={`${sz} ${colors[idx]} rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-sm`}>
    {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full rounded-xl object-cover" /> : initials}
  </div>;
}

export default function ChatPage() {'''

c = c.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print("Done")
