import sqlite3
import os

db_paths = [
    'c:/Users/lohit/Downloads/AgriGuard/agriguard.db',
    'c:/Users/lohit/Downloads/AgriGuard/backend/agriguard.db'
]

for db_path in db_paths:
    if os.path.exists(db_path):
        size = os.path.getsize(db_path)
        print("="*70)
        print(f"DATABASE: {db_path} (Size: {size:,} bytes)")
        print("="*70)
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
        print("Tables in DB:", tables)
        for t in tables:
            count = cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
            print(f"  - Table '{t}': {count} records")
        
        if 'users' in tables:
            print("\n--- USER RECORDS ---")
            cols = [c[1] for c in cur.execute("PRAGMA table_info(users)").fetchall()]
            print("Columns:", cols)
            users = cur.execute("SELECT * FROM users").fetchall()
            for u in users:
                row_dict = dict(zip(cols, u))
                # don't print full hash, just preview
                if 'hashed_password' in row_dict:
                    row_dict['hashed_password'] = row_dict['hashed_password'][:15] + '...'
                print(" ", row_dict)
        
        if 'scans' in tables:
            print("\n--- SCAN RECORDS ---")
            scols = [c[1] for c in cur.execute("PRAGMA table_info(scans)").fetchall()]
            scans = cur.execute("SELECT * FROM scans").fetchall()
            for s in scans:
                s_dict = dict(zip(scols, s))
                print(" ", s_dict)
        
        conn.close()
