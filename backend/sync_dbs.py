import sqlite3
import shutil

backend_db = 'c:/Users/lohit/Downloads/AgriGuard/backend/agriguard.db'
root_db = 'c:/Users/lohit/Downloads/AgriGuard/agriguard.db'

# Update lohith in backend DB
conn = sqlite3.connect(backend_db)
cur = conn.cursor()
cur.execute("UPDATE users SET hashed_password = ?, full_name = ? WHERE email = ?", 
            ('$2b$12$pYDqcySaKHX4cpzMVgSGF.VeH3k.Q9z6twTBpFFgcs0JFSiZEJYye', 'LOHITH', 'lohithgamer12@gmail.com'))
conn.commit()
conn.close()

# Keep root DB identical as well so any relative reference hits the exact same data
shutil.copy2(backend_db, root_db)
print("Synchronized backend/agriguard.db and root agriguard.db successfully!")
