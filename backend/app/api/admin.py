"""
Admin & Database Control API endpoints for AgriGuard.
RESTRICTED ACCESS: All endpoints require authentication and are authorized EXCLUSIVELY for Lohith.
Provides complete visibility, usage audits, user administration, and backup controls.
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional, List
import db_control

from app.models.models import User
from app.api.deps import require_lohith_admin

router = APIRouter(prefix="/admin", tags=["admin-database"])

class ResetPasswordRequest(BaseModel):
    email: str
    new_password: str

class CreateUserRequest(BaseModel):
    email: str
    full_name: str
    password: str

class SqlQueryRequest(BaseModel):
    query: str

class SwitchProviderRequest(BaseModel):
    provider: str  # "local" or "supabase"
    database_url: Optional[str] = None

@router.get("/db/stats")
def get_database_stats(admin_user: User = Depends(require_lohith_admin)):
    """Returns complete real-time database, user, scan, and storage statistics (Lohith only)."""
    try:
        return db_control.get_stats_data()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/db/users")
def get_all_users(admin_user: User = Depends(require_lohith_admin)):
    """Returns detailed user directory with per-user scan counts and disk storage usage (Lohith only)."""
    try:
        stats = db_control.get_stats_data()
        return {"users": stats["users"], "total_users": stats["total_users"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/db/backup")
def trigger_database_backup(admin_user: User = Depends(require_lohith_admin)):
    """Generates an instant dated SQLite backup of the database (Lohith only)."""
    try:
        backup_path = db_control.backup_db()
        return {"status": "success", "backup_path": backup_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/db/vacuum")
def trigger_database_vacuum(admin_user: User = Depends(require_lohith_admin)):
    """Performs SQLite VACUUM and ANALYZE for query speed and file size reduction (Lohith only)."""
    try:
        db_control.vacuum_db()
        return {"status": "success", "message": "Database optimized successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/db/users")
def create_user(req: CreateUserRequest, admin_user: User = Depends(require_lohith_admin)):
    """Admin endpoint to create a new user account (Lohith only)."""
    try:
        db_control.add_user(req.email, req.full_name, req.password)
        return {"status": "success", "message": f"User {req.email} created"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/db/reset-password")
def reset_user_password(req: ResetPasswordRequest, admin_user: User = Depends(require_lohith_admin)):
    """Admin endpoint to reset any user's password (Lohith only)."""
    try:
        db_control.reset_password(req.email, req.new_password)
        return {"status": "success", "message": f"Password updated for {req.email}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/db/users/{email}")
def delete_user_account(email: str, wipe_data: bool = Query(False), admin_user: User = Depends(require_lohith_admin)):
    """Admin endpoint to remove a user and optionally purge their photo storage (Lohith only)."""
    try:
        db_control.delete_user(email, wipe_data=wipe_data)
        return {"status": "success", "message": f"User {email} removed"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/db/tables")
def list_database_tables(admin_user: User = Depends(require_lohith_admin)):
    """Returns all tables in the database with their columns and row counts (Lohith only)."""
    try:
        tables = db_control.get_all_tables_info()
        return {"tables": tables}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/db/tables/{table_name}")
def get_table_content(
    table_name: str,
    limit: int = Query(50),
    offset: int = Query(0),
    search: str = Query(""),
    admin_user: User = Depends(require_lohith_admin),
):
    """Returns data rows for a specific table with search and pagination (Lohith only)."""
    try:
        data = db_control.get_table_rows(table_name, limit=limit, offset=offset, search=search)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/db/sql")
def execute_sql(req: SqlQueryRequest, admin_user: User = Depends(require_lohith_admin)):
    """Executes a custom SQL query and returns formatted column headers and records (Lohith only)."""
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    try:
        result = db_control.run_sql_query(req.query)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/db/supabase-export")
def get_supabase_sql_export(admin_user: User = Depends(require_lohith_admin)):
    """Generates ready-to-run PostgreSQL/Supabase migration script containing schema and all data (Lohith only)."""
    try:
        sql = db_control.generate_supabase_sql()
        return {"sql": sql}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/db/provider")
def get_database_provider(admin_user: User = Depends(require_lohith_admin)):
    """Returns the current database provider configuration (Lohith only)."""
    from app.core.config import get_settings
    settings = get_settings()
    is_sqlite = "sqlite" in settings.DATABASE_URL
    return {
        "provider": "local" if is_sqlite else "supabase",
        "engine": "SQLite 3 (Local Laptop Server)" if is_sqlite else "Supabase Cloud (PostgreSQL)",
        "database_url_masked": settings.DATABASE_URL.split("@")[-1] if "@" in settings.DATABASE_URL else settings.DATABASE_URL,
        "is_cloud": not is_sqlite
    }

@router.post("/db/switch-provider")
async def switch_database_provider(req: SwitchProviderRequest, admin_user: User = Depends(require_lohith_admin)):
    """Switch active database between Local Laptop SQLite and Free Supabase PostgreSQL (Lohith only)."""
    import re
    from pathlib import Path
    from sqlalchemy import text
    
    env_file = Path(__file__).resolve().parent.parent.parent / ".env"
    
    if req.provider == "local":
        if env_file.exists():
            content = env_file.read_text(encoding="utf-8")
            content = re.sub(r"^DATABASE_URL=.*$", "# DATABASE_URL=...", content, flags=re.MULTILINE)
            env_file.write_text(content, encoding="utf-8")
        return {
            "status": "success", 
            "provider": "local", 
            "message": "Switched to local SQLite database. The laptop is acting as the primary database server."
        }
        
    elif req.provider == "supabase":
        if not req.database_url or not req.database_url.strip():
            raise HTTPException(status_code=400, detail="Database URL is required for Supabase")
            
        url = req.database_url.strip()
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            
        # Test connection before updating .env
        try:
            from sqlalchemy.ext.asyncio import create_async_engine
            test_engine = create_async_engine(url, connect_args={"ssl": True})
            async with test_engine.connect() as conn:
                await conn.execute(text("SELECT 1;"))
            await test_engine.dispose()
        except Exception as err:
            raise HTTPException(status_code=400, detail=f"Failed to connect to Supabase: {str(err)}")
            
        if env_file.exists():
            content = env_file.read_text(encoding="utf-8")
            if re.search(r"^#?\s*DATABASE_URL=", content, flags=re.MULTILINE):
                content = re.sub(r"^#?\s*DATABASE_URL=.*$", f"DATABASE_URL={url}", content, flags=re.MULTILINE)
            else:
                content += f"\nDATABASE_URL={url}\n"
            env_file.write_text(content, encoding="utf-8")
            
        return {
            "status": "success", 
            "provider": "supabase", 
            "message": "Successfully verified and connected to Supabase PostgreSQL cloud database!"
        }
