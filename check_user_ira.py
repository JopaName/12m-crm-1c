import sqlite3
conn = sqlite3.connect('/root/12m-crm-1c/backend/prisma/dev.db')
cur = conn.cursor()
cur.execute("SELECT id, firstName, lastName, email FROM User WHERE id LIKE '%cmrc3%' OR email LIKE '%solodilova%'")
for row in cur.fetchall():
    print(row)
conn.close()
