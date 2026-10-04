"""
AgriGuard Database Control Center (CLI & API Utility)
Provides full control, statistics, user management, backups, and storage audits.
"""
from __future__ import annotations
import sys
import os
import sqlite3
import shutil
import csv
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Force UTF-8 on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Detect DB File (check backend/agriguard.db first)
BASE_DIR = Path(__file__).resolve().parent
if (BASE_DIR / "backend" / "agriguard.db").exists():
    DB_FILE = BASE_DIR / "backend" / "agriguard.db"
    UPLOADS_DIR = BASE_DIR / "backend" / "uploads"
    BACKUP_DIR = BASE_DIR / "backend" / "backups"
else:
    DB_FILE = BASE_DIR / "agriguard.db"
    UPLOADS_DIR = BASE_DIR / "uploads"
    BACKUP_DIR = BASE_DIR / "backups"

def get_connection() -> sqlite3.Connection:
    if not DB_FILE.exists():
        print(f"[!] Database file not found at {DB_FILE}")
        sys.exit(1)
    conn = sqlite3.connect(str(DB_FILE))
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str) -> str:
    try:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.hash(password)
    except ImportError:
        import hashlib
        # fallback if passlib not imported
        return hashlib.sha256(password.encode()).hexdigest()

def format_size(bytes_num: int) -> str:
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_num < 1024.0:
            return f"{bytes_num:.1f} {unit}"
        bytes_num /= 1024.0
    return f"{bytes_num:.1f} TB"

def get_user_storage(username: str) -> tuple[int, int]:
    user_dir = UPLOADS_DIR / "users" / username
    if not user_dir.exists():
        return 0, 0
    total_bytes = 0
    total_files = 0
    for root, _, files in os.walk(user_dir):
        for f in files:
            fp = Path(root) / f
            total_bytes += fp.stat().st_size
            total_files += 1
    return total_bytes, total_files

def get_stats_data() -> dict:
    conn = get_connection()
    cur = conn.cursor()
    
    users_rows = cur.execute("SELECT id, email, full_name, is_active, created_at FROM users").fetchall()
    users_data = []
    
    for u in users_rows:
        username = u["email"].split("@")[0]
        size_bytes, file_count = get_user_storage(username)
        scans = cur.execute("SELECT is_healthy, status, crop_id, confidence FROM scans WHERE user_id = ?", (u["id"],)).fetchall()
        
        healthy = sum(1 for s in scans if s["is_healthy"] == 1 or s["status"] == "healthy")
        uncertain = sum(1 for s in scans if s["status"] == "uncertain")
        diseased = len(scans) - healthy - uncertain
        
        users_data.append({
            "id": u["id"],
            "email": u["email"],
            "username": username,
            "full_name": u["full_name"] or "Farmer",
            "is_active": bool(u["is_active"]),
            "created_at": str(u["created_at"]),
            "total_scans": len(scans),
            "scans_healthy": healthy,
            "scans_diseased": diseased,
            "scans_uncertain": uncertain,
            "storage_bytes": size_bytes,
            "storage_formatted": format_size(size_bytes),
            "files_count": file_count
        })
        
    crops_count = cur.execute("SELECT COUNT(*) FROM crops").fetchone()[0]
    diseases_count = cur.execute("SELECT COUNT(*) FROM diseases").fetchone()[0]
    scans_count = cur.execute("SELECT COUNT(*) FROM scans").fetchone()[0]
    sensors_count = cur.execute("SELECT COUNT(*) FROM sensor_readings").fetchone()[0]
    db_size = DB_FILE.stat().st_size
    
    # Total uploads size
    total_uploads = 0
    if UPLOADS_DIR.exists():
        for root, _, files in os.walk(UPLOADS_DIR):
            for f in files:
                total_uploads += (Path(root) / f).stat().st_size
                
    conn.close()
    
    return {
        "database_path": str(DB_FILE),
        "database_size_bytes": db_size,
        "database_size_formatted": format_size(db_size),
        "total_uploads_bytes": total_uploads,
        "total_uploads_formatted": format_size(total_uploads),
        "total_users": len(users_data),
        "total_crops": crops_count,
        "total_diseases": diseases_count,
        "total_scans": scans_count,
        "total_sensor_readings": sensors_count,
        "users": users_data
    }

def print_stats():
    stats = get_stats_data()
    print("=" * 75)
    print("           [AGRIGUARD DATABASE CONTROL & AUDIT REPORT]           ")
    print("=" * 75)
    print(f"Database File:   {stats['database_path']}")
    print(f"Database Size:   {stats['database_size_formatted']} ({stats['database_size_bytes']:,} bytes)")
    print(f"Uploads Storage: {stats['total_uploads_formatted']} ({stats['total_uploads_bytes']:,} bytes)")
    print(f"Total Users:     {stats['total_users']}")
    print(f"Total Scans:     {stats['total_scans']}")
    print(f"Sensor Readings: {stats['total_sensor_readings']}")
    print(f"Crops Catalog:   {stats['total_crops']} crops / {stats['total_diseases']} disease classes")
    print("-" * 75)
    print(f"{'#':<3} {'USERNAME':<16} {'NAME':<16} {'SCANS':<7} {'HEALTHY':<8} {'DISEASE':<8} {'STORAGE':<10}")
    print("-" * 75)
    for idx, u in enumerate(stats['users'], 1):
        print(f"{idx:<3} {u['username']:<16} {u['full_name'][:15]:<16} {u['total_scans']:<7} {u['scans_healthy']:<8} {u['scans_diseased']:<8} {u['storage_formatted']:<10}")
    print("=" * 75)

def list_users():
    conn = get_connection()
    cur = conn.cursor()
    users = cur.execute("SELECT id, email, full_name, is_active, created_at FROM users ORDER BY created_at DESC").fetchall()
    print(f"\n[+] Total Registered Users: {len(users)}\n")
    for idx, u in enumerate(users, 1):
        username = u["email"].split("@")[0]
        size_bytes, files = get_user_storage(username)
        scans_count = cur.execute("SELECT COUNT(*) FROM scans WHERE user_id = ?", (u["id"],)).fetchone()[0]
        print(f"[{idx}] User: {u['full_name']} (@{username})")
        print(f"    Email:      {u['email']}")
        print(f"    User ID:    {u['id']}")
        print(f"    Status:     {'Active' if u['is_active'] else 'Inactive'}")
        print(f"    Joined:     {u['created_at']}")
        print(f"    Scans:      {scans_count}")
        print(f"    Disk Usage: {format_size(size_bytes)} ({files} image files)")
        print()
    conn.close()

def add_user(email: str, full_name: str, password: str):
    conn = get_connection()
    cur = conn.cursor()
    existing = cur.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        print(f"[!] Error: User with email '{email}' already exists.")
        conn.close()
        return
    user_id = str(uuid.uuid4())
    pw_hash = hash_password(password)
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    cur.execute(
        "INSERT INTO users (id, email, hashed_password, full_name, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, email, pw_hash, full_name, 1, now_iso)
    )
    conn.commit()
    conn.close()
    
    # Create user uploads folder
    username = email.split("@")[0]
    user_dir = UPLOADS_DIR / "users" / username / "thumbs"
    user_dir.mkdir(parents=True, exist_ok=True)
    print(f"[OK] Created user '{full_name}' ({email}) successfully!")
    print(f"[OK] Created isolated storage at: {user_dir.parent}")

def reset_password(email: str, new_password: str):
    conn = get_connection()
    cur = conn.cursor()
    existing = cur.execute("SELECT id, full_name FROM users WHERE email = ?", (email,)).fetchone()
    if not existing:
        print(f"[!] Error: No user found with email '{email}'")
        conn.close()
        return
    pw_hash = hash_password(new_password)
    cur.execute("UPDATE users SET hashed_password = ? WHERE email = ?", (pw_hash, email))
    conn.commit()
    conn.close()
    print(f"[OK] Successfully reset password for {existing['full_name']} ({email})")

def delete_user(email: str, wipe_data: bool = False):
    conn = get_connection()
    cur = conn.cursor()
    existing = cur.execute("SELECT id, full_name FROM users WHERE email = ?", (email,)).fetchone()
    if not existing:
        print(f"[!] Error: No user found with email '{email}'")
        conn.close()
        return
    uid = existing["id"]
    name = existing["full_name"]
    
    cur.execute("DELETE FROM scans WHERE user_id = ?", (uid,))
    cur.execute("DELETE FROM users WHERE id = ?", (uid,))
    conn.commit()
    conn.close()
    print(f"[OK] Removed user '{name}' ({email}) and associated scan records from database.")
    
    if wipe_data:
        username = email.split("@")[0]
        user_dir = UPLOADS_DIR / "users" / username
        if user_dir.exists():
            shutil.rmtree(user_dir)
            print(f"[OK] Cleaned storage directory: {user_dir}")

def backup_db() -> str:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dest = BACKUP_DIR / f"agriguard_backup_{timestamp}.db"
    
    # Use SQLite native backup for 100% integrity
    src_conn = get_connection()
    dst_conn = sqlite3.connect(str(dest))
    with dst_conn:
        src_conn.backup(dst_conn)
    dst_conn.close()
    src_conn.close()
    
    print(f"[OK] Backup created successfully: {dest}")
    print(f"    Size: {format_size(dest.stat().st_size)}")
    return str(dest)

def vacuum_db():
    conn = get_connection()
    before_size = DB_FILE.stat().st_size
    conn.execute("VACUUM;")
    conn.execute("ANALYZE;")
    conn.close()
    after_size = DB_FILE.stat().st_size
    print(f"[OK] Database optimized! Size: {format_size(before_size)} -> {format_size(after_size)}")

def export_table_csv(table_name: str, output_file: str | None = None):
    conn = get_connection()
    cur = conn.cursor()
    try:
        rows = cur.execute(f"SELECT * FROM {table_name}").fetchall()
    except sqlite3.OperationalError as e:
        print(f"[!] Error querying table '{table_name}': {e}")
        conn.close()
        return
    if not rows:
        print(f"[!] Table '{table_name}' has 0 records.")
        conn.close()
        return
    cols = [col[0] for col in cur.description]
    if not output_file:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = str(BASE_DIR / f"export_{table_name}_{timestamp}.csv")
    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(cols)
        for r in rows:
            writer.writerow([r[c] for c in cols])
    conn.close()
    print(f"[OK] Exported {len(rows)} records from '{table_name}' to {output_file}")

def execute_query(sql: str):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(sql)
        if sql.strip().upper().startswith("SELECT"):
            rows = cur.fetchall()
            if not rows:
                print("(0 rows returned)")
            else:
                cols = [col[0] for col in cur.description]
                print(" | ".join(cols))
                print("-" * (len(" | ".join(cols)) + 5))
                for r in rows:
                    print(" | ".join(str(r[c]) for c in cols))
        else:
            conn.commit()
            print(f"[OK] Executed successfully. Rows affected: {cur.rowcount}")
    except Exception as e:
        print(f"[!] SQL Error: {e}")
    finally:
        conn.close()

def get_all_tables_info():
    conn = get_connection()
    cur = conn.cursor()
    tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()]
    res = []
    for t in tables:
        count = cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        cols = [c[1] for c in cur.execute(f"PRAGMA table_info({t})").fetchall()]
        res.append({"name": t, "count": count, "columns": cols})
    conn.close()
    return res

def get_table_rows(table_name: str, limit: int = 50, offset: int = 0, search: str = ""):
    conn = get_connection()
    cur = conn.cursor()
    cols = [c[1] for c in cur.execute(f"PRAGMA table_info({table_name})").fetchall()]
    
    query = f"SELECT * FROM {table_name}"
    params = []
    if search:
        # Search text in first 3 text columns
        text_cols = cols[:4]
        where_clauses = [f"{col} LIKE ?" for col in text_cols]
        query += " WHERE " + " OR ".join(where_clauses)
        params = [f"%{search}%" for _ in text_cols]
        
    query += " LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    
    rows = cur.execute(query, params).fetchall()
    total_count = cur.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]
    
    result_rows = []
    for r in rows:
        row_dict = {}
        for c in cols:
            val = r[c]
            # don't expose full password hashes in table view
            if c == "hashed_password" and val:
                val = str(val)[:12] + "••••••••"
            row_dict[c] = val
        result_rows.append(row_dict)
        
    conn.close()
    return {
        "table": table_name,
        "columns": cols,
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "rows": result_rows
    }

def run_sql_query(sql: str):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(sql)
        if sql.strip().upper().startswith("SELECT") or sql.strip().upper().startswith("PRAGMA"):
            rows = cur.fetchall()
            cols = [col[0] for col in cur.description] if cur.description else []
            data = []
            for r in rows:
                data.append({cols[i]: r[i] for i in range(len(cols))})
            return {"status": "success", "type": "select", "columns": cols, "rows": data, "count": len(data)}
        else:
            conn.commit()
            return {"status": "success", "type": "mutation", "rows_affected": cur.rowcount}
    except Exception as e:
        return {"status": "error", "error": str(e)}
    finally:
        conn.close()

def generate_supabase_sql() -> str:
    """Generates complete PostgreSQL / Supabase SQL DDL and data insert statements."""
    conn = get_connection()
    cur = conn.cursor()
    
    output = []
    output.append("-- ==========================================================")
    output.append("-- AgriGuard Database Export for Free Supabase / PostgreSQL")
    output.append(f"-- Generated: {datetime.now().isoformat()}")
    output.append("-- Paste this script into Supabase SQL Editor and click 'Run'")
    output.append("-- ==========================================================\n")
    
    # Tables in dependency order
    table_order = ["users", "crops", "diseases", "devices", "sensor_readings", "scans"]
    
    ddl = {
        "users": """
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
""",
        "crops": """
CREATE TABLE IF NOT EXISTS crops (
    id VARCHAR(36) PRIMARY KEY,
    slug VARCHAR(64) UNIQUE NOT NULL,
    name_key VARCHAR(64) NOT NULL,
    icon_emoji VARCHAR(8)
);
CREATE INDEX IF NOT EXISTS idx_crops_slug ON crops(slug);
""",
        "diseases": """
CREATE TABLE IF NOT EXISTS diseases (
    id VARCHAR(36) PRIMARY KEY,
    slug VARCHAR(64) UNIQUE NOT NULL,
    crop_id VARCHAR(36) REFERENCES crops(id) ON DELETE CASCADE,
    name_key VARCHAR(64) NOT NULL,
    class_label VARCHAR(128)
);
CREATE INDEX IF NOT EXISTS idx_diseases_slug ON diseases(slug);
""",
        "devices": """
CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    location VARCHAR(128),
    key_hash VARCHAR(128) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
""",
        "sensor_readings": """
CREATE TABLE IF NOT EXISTS sensor_readings (
    id VARCHAR(36) PRIMARY KEY,
    device_id VARCHAR(36),
    soil_moisture FLOAT NOT NULL,
    temp_c FLOAT NOT NULL,
    humidity FLOAT NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sensor_recorded_at ON sensor_readings(recorded_at);
""",
        "scans": """
CREATE TABLE IF NOT EXISTS scans (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    crop_id VARCHAR(36) REFERENCES crops(id) ON DELETE SET NULL,
    image_url VARCHAR(512) NOT NULL,
    thumb_url VARCHAR(512),
    is_healthy BOOLEAN NOT NULL,
    disease_id VARCHAR(36) REFERENCES diseases(id) ON DELETE SET NULL,
    confidence FLOAT NOT NULL,
    top3 JSONB DEFAULT '[]'::jsonb,
    severity VARCHAR(32) DEFAULT 'none',
    severity_pct FLOAT DEFAULT 0.0,
    low_confidence BOOLEAN DEFAULT FALSE,
    model_version VARCHAR(64) DEFAULT 'v1.0',
    status VARCHAR(32) NOT NULL,
    crop_auto_detected BOOLEAN DEFAULT FALSE,
    condition_type VARCHAR(32) DEFAULT 'disease',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
"""
    }
    
    for tbl in table_order:
        output.append(ddl.get(tbl, f"-- Table {tbl}"))
        rows = cur.execute(f"SELECT * FROM {tbl}").fetchall()
        if rows:
            cols = [c[1] for c in cur.execute(f"PRAGMA table_info({tbl})").fetchall()]
            output.append(f"-- Inserting {len(rows)} records into {tbl}")
            for r in rows:
                val_strs = []
                for c in cols:
                    v = r[c]
                    boolean_cols = {"is_active", "is_healthy", "low_confidence", "crop_auto_detected"}
                    if c in boolean_cols:
                        val_strs.append("TRUE" if v in (1, True, "1", "true") else "FALSE")
                    elif v is None:
                        val_strs.append("NULL")
                    elif isinstance(v, bool):
                        val_strs.append("TRUE" if v else "FALSE")
                    elif isinstance(v, (int, float)):
                        val_strs.append(str(v))
                    else:
                        v_str = str(v).replace("'", "''")
                        val_strs.append(f"'{v_str}'")
                col_list = ", ".join(cols)
                vals_list = ", ".join(val_strs)
                output.append(f"INSERT INTO {tbl} ({col_list}) VALUES ({vals_list}) ON CONFLICT DO NOTHING;")
            output.append("")
            
    conn.close()
    return "\n".join(output)


def interactive_menu():
    while True:
        print("\n" + "=" * 55)
        print("       * AGRIGUARD DATABASE CONTROL CONSOLE *       ")
        print("=" * 55)
        print("  1. View Database Stats & User Usage Breakdown")
        print("  2. List All Users & Scans")
        print("  3. Create New User Account")
        print("  4. Reset User Password")
        print("  5. Delete User Account")
        print("  6. Create Instant Database Backup (.db)")
        print("  7. Export Table to CSV (users / scans / sensors)")
        print("  8. Vacuum & Optimize Database")
        print("  9. Run Custom SQL Query")
        print("  0. Exit")
        print("=" * 55)
        choice = input("Select an option (0-9): ").strip()
        
        if choice == "1":
            print_stats()
        elif choice == "2":
            list_users()
        elif choice == "3":
            email = input("Email: ").strip()
            name = input("Full Name: ").strip()
            pw = input("Password: ").strip()
            if email and name and pw:
                add_user(email, name, pw)
            else:
                print("[!] All fields are required.")
        elif choice == "4":
            email = input("User email to reset: ").strip()
            pw = input("New password: ").strip()
            if email and pw:
                reset_password(email, pw)
        elif choice == "5":
            email = input("User email to DELETE: ").strip()
            wipe = input("Wipe user uploads directory too? (y/N): ").strip().lower() == "y"
            confirm = input(f"Are you sure you want to permanently delete {email}? (yes/no): ").strip().lower()
            if confirm == "yes":
                delete_user(email, wipe_data=wipe)
        elif choice == "6":
            backup_db()
        elif choice == "7":
            tbl = input("Table name (users / scans / sensor_readings / crops / diseases): ").strip()
            export_table_csv(tbl)
        elif choice == "8":
            vacuum_db()
        elif choice == "9":
            sql = input("SQL query: ").strip()
            if sql:
                execute_query(sql)
        elif choice == "0":
            print("Exiting Database Control. Goodbye!")
            break
        else:
            print("[!] Invalid option. Please choose between 0 and 9.")

if __name__ == "__main__":
    if len(sys.argv) == 1:
        # If no arguments provided, launch stats or menu
        print_stats()
        print("\nTip: Run with arguments or interactive commands:")
        print("  python db_control.py stats")
        print("  python db_control.py list-users")
        print("  python db_control.py backup")
        print("  python db_control.py reset-password <email> <new_password>")
        print("  python db_control.py add-user <email> <name> <password>")
        print("  python db_control.py delete-user <email>")
        print("  python db_control.py vacuum")
        print("  python db_control.py export <table_name>")
        print("  python db_control.py sql \"<SELECT ...>\"")
        print("  python db_control.py --menu  (Interactive Console)")
    elif sys.argv[1] in ["--menu", "-m", "menu"]:
        interactive_menu()
    elif sys.argv[1] == "stats":
        print_stats()
    elif sys.argv[1] in ["list-users", "users"]:
        list_users()
    elif sys.argv[1] == "backup":
        backup_db()
    elif sys.argv[1] == "vacuum":
        vacuum_db()
    elif sys.argv[1] == "add-user" and len(sys.argv) >= 5:
        add_user(sys.argv[2], sys.argv[3], sys.argv[4])
    elif sys.argv[1] == "reset-password" and len(sys.argv) >= 4:
        reset_password(sys.argv[2], sys.argv[3])
    elif sys.argv[1] == "delete-user" and len(sys.argv) >= 3:
        wipe = "--wipe" in sys.argv
        delete_user(sys.argv[2], wipe_data=wipe)
    elif sys.argv[1] == "export" and len(sys.argv) >= 3:
        export_table_csv(sys.argv[2])
    elif sys.argv[1] == "sql" and len(sys.argv) >= 3:
        execute_query(" ".join(sys.argv[2:]))
    else:
        print("[!] Unknown command. Usage: python db_control.py [stats|list-users|backup|vacuum|export|add-user|reset-password|delete-user|sql]")
