import re

with open('/root/12m-crm-1c/frontend/src/pages/ChatPage.tsx.bak', 'r', encoding='utf-8') as f:
    content = f.read()

# ===== STATE additions =====
state_insertions = '''
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [searchUsers, setSearchUsers] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
'''

state_marker = '  const [showPinned, setShowPinned] = useState(false);\n  const [showSearchResults, setShowSearchResults] = useState(false);'
if state_marker in content:
    content = content.replace(state_marker, state_marker + state_insertions)
    print("States inserted")
else:
    print("State marker NOT found")

# ===== Add searchUsers handler =====
search_users_fn = '''
  const handleSearchUsers = useCallback(async (q: string) => {
    setUserSearch(q);
    if (q.length < 2) { setSearchUsers([]); setSearchingUsers(false); return; }
    setSearchingUsers(true);
    try {
      const { authAPI } = await import("../api");
      const res = await authAPI.searchUsers(q);
      setSearchUsers(res.data?.data || res.data || []);
    } catch { setSearchUsers([]); }
    setSearchingUsers(false);
  }, []);
'''

# Insert handleSearchUsers after the last useCallback that handles search (the message search)
# Find placement: after the closing of handleSearch for message search
# This is tricky - find a good anchor point
handler_anchor = '  const [showSearchResults, setShowSearchResults] = useState(false);'
if handler_anchor in content:
    idx = content.find(handler_anchor) + len(handler_anchor)
    # Find next useEffect or useCallback after this
    rest = content[idx:]
    import re2
    m = re2.search(r'\n\s*(useEffect|const handle)', rest)
    if m:
        insert_pos = idx + m.start()
        content = content[:insert_pos] + '\n' + search_users_fn + content[insert_pos:]
        print("Search handler inserted")
else:
    print("Handler anchor NOT found")

# ===== Sidebar header: Add buttons =====
old_header = '          <div className="flex items-center justify-between mb-2">\n            <h2 className="text-lg font-bold text-gray-800">Чаты</h2>\n          </div>'

new_header = '''          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-800 tracking-tight">Чаты</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setShowUserSearch(!showUserSearch); setUserSearch(""); setSearchUsers([]); }}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all active:scale-95 ${showUserSearch ? "bg-blue-100 text-blue-600" : "bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700"}`}
                title="Новый чат"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={() => setShowCreateRoom(true)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all active:scale-95"
                title="Создать группу"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>'''

if old_header in content:
    content = content.replace(old_header, new_header)
    print("Header replaced")
else:
    # Try to find partial match
    if 'Чаты</h2>' in content and 'mb-2' in content:
        print("Header partial match - checking indentation...")
        for line in content.split('\n'):
            if 'Чаты</h2>' in line and 'mb-2' not in content:
                break
    print("Header NOT found - checking if already modified")
    if 'showUserSearch' in content:
        print("  Already has showUserSearch - header was already updated")

# ===== Add user search panel =====
user_search_panel = '''        {/* User search */}
        {showUserSearch && (
          <div className="border-b border-slate-100 bg-blue-50/40">
            <div className="px-4 py-3">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Поиск сотрудников..."
                  value={userSearch}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-blue-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  autoFocus
                />
              </div>
              {searchingUsers && (
                <div className="flex items-center justify-center py-4">
                  <svg className="w-5 h-5 animate-spin text-blue-500" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
              {!searchingUsers && userSearch.length >= 2 && searchUsers.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">Ничего не найдено</p>
              )}
              {searchUsers.length > 0 && (
                <div className="mt-2 max-h-60 overflow-y-auto space-y-0.5">
                  {searchUsers.map((su: any) => (
                    <button
                      key={su.id}
                      onClick={() => {
                        setSelectedUserId(su.id);
                        setSelectedRoomId(null);
                        setShowUserSearch(false);
                        setUserSearch("");
                        setSearchUsers([]);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-100/60 transition-all text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {((su.firstName?.[0] || "") + (su.lastName?.[0] || "")) || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{su.firstName} {su.lastName}</div>
                        <div className="text-xs text-slate-500 truncate">{su.email || su.role?.name || ""}</div>
                      </div>
                      <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
              {userSearch.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">Введите имя или email сотрудника</p>
              )}
            </div>
          </div>
        )}
'''

cl_marker = '        {/* Conversation list */}'
if cl_marker in content:
    content = content.replace(cl_marker, user_search_panel + '\n        ' + cl_marker)
    print("User search panel inserted")
else:
    print("Conversation list marker NOT found!")

with open('/root/12m-crm-1c/frontend/src/pages/ChatPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done! File updated.")
