import sqlite3
conn = sqlite3.connect('/root/12m-crm-1c/backend/prisma/dev.db')
cur = conn.cursor()
cur.execute("SELECT id, firstName, lastName, email, isActive, isArchived FROM User WHERE firstName LIKE ? OR lastName LIKE ?", ('%Тест%', '%Тест%'))
for row in cur.fetchall():
    print(row)
cur.execute("SELECT COUNT(*) FROM User WHERE isArchived = 0")
print("Total active users:", cur.fetchone()[0])
cur.execute("SELECT firstName, lastName FROM User WHERE isArchived = 0 LIMIT 20")
for row in cur.fetchall():
    print("  -", row[0], row[1])
conn.close()
