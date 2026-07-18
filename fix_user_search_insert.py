p = '/root/12m-crm-1c/frontend/src/pages/ChatPage.tsx'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

insertion = '''        </div>

        {/* User search */}
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

        {/* Conversation list */}'''

target = '''        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto py-1">'''

if target in c:
    c = c.replace(target, insertion + '\n' + target)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)
    print('User search inserted successfully')
else:
    print('Target not found!')
    # Debug: show surrounding chars
    idx = c.find('Conversation list')
    print(c[idx-50:idx+100])
