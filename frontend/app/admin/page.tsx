"use client";

import { useEffect, useState } from "react";
import { 
  Database, Users, HardDrive, Image as ImageIcon, Activity, 
  ShieldCheck, RefreshCw, KeyRound, UserPlus, Trash2, 
  Download, Sparkles, CheckCircle2, AlertCircle, FileSpreadsheet, Server,
  Table, Terminal, Cloud, Play, Search, ArrowRight, ExternalLink, Copy
} from "lucide-react";

interface UserStat {
  id: string;
  email: string;
  username: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  total_scans: number;
  scans_healthy: number;
  scans_diseased: number;
  scans_uncertain: number;
  storage_bytes: number;
  storage_formatted: string;
  files_count: number;
}

interface DbStats {
  database_path: string;
  database_size_bytes: number;
  database_size_formatted: string;
  total_uploads_bytes: number;
  total_uploads_formatted: string;
  total_users: number;
  total_crops: number;
  total_diseases: number;
  total_scans: number;
  total_sensor_readings: number;
  users: UserStat[];
}

interface TableMeta {
  name: string;
  count: number;
  columns: string[];
}

export default function AdminDatabasePage() {
  const [activeTab, setActiveTab] = useState<"overview" | "tables" | "sql" | "supabase">("overview");
  const [stats, setStats] = useState<DbStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [operating, setOperating] = useState(false);

  // Table Editor State
  const [tablesList, setTablesList] = useState<TableMeta[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("users");
  const [tableData, setTableData] = useState<{ columns: string[]; rows: any[]; total: number } | null>(null);
  const [tableSearch, setTableSearch] = useState("");
  const [tableLoading, setTableLoading] = useState(false);

  // SQL Runner State
  const [sqlQuery, setSqlQuery] = useState("SELECT id, slug, name_key FROM crops LIMIT 10;");
  const [sqlResult, setSqlResult] = useState<any>(null);
  const [sqlLoading, setSqlLoading] = useState(false);

  // Supabase State
  const [supabaseSql, setSupabaseSql] = useState<string>("");
  const [copiedSql, setCopiedSql] = useState(false);
  const [supabaseUri, setSupabaseUri] = useState("");
  const [providerInfo, setProviderInfo] = useState<any>(null);

  // Modals state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");

  const [resetEmail, setResetEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const [deleteEmail, setDeleteEmail] = useState<string | null>(null);
  const [wipeUploads, setWipeUploads] = useState(false);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/db/stats");
      if (!res.ok) throw new Error("Failed to load database stats");
      const data = await res.json();
      setStats(data);
    } catch (e: any) {
      setActionMsg({ type: "error", text: e.message || "Could not connect to database API" });
    } finally {
      setLoading(false);
    }
  }

  async function fetchTablesList() {
    try {
      const res = await fetch("/api/v1/admin/db/tables");
      if (res.ok) {
        const data = await res.json();
        setTablesList(data.tables || []);
        if (data.tables?.length && !selectedTable) {
          setSelectedTable(data.tables[0].name);
        }
      }
    } catch (_) {}
  }

  async function fetchTableContent(tableName: string, search: string = "") {
    setTableLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/db/tables/${tableName}?search=${encodeURIComponent(search)}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setTableData(data);
      }
    } catch (_) {
    } finally {
      setTableLoading(false);
    }
  }

  async function fetchProvider() {
    try {
      const res = await fetch("/api/v1/admin/db/provider");
      if (res.ok) {
        const data = await res.json();
        setProviderInfo(data);
      }
    } catch (_) {}
  }

  useEffect(() => {
    fetchStats();
    fetchTablesList();
    fetchProvider();
  }, []);

  useEffect(() => {
    if (activeTab === "tables" && selectedTable) {
      fetchTableContent(selectedTable, tableSearch);
    }
  }, [activeTab, selectedTable]);

  async function handleRunSql() {
    setSqlLoading(true);
    setSqlResult(null);
    try {
      const res = await fetch("/api/v1/admin/db/sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sqlQuery }),
      });
      const data = await res.json();
      setSqlResult(data);
    } catch (e: any) {
      setSqlResult({ status: "error", error: e.message });
    } finally {
      setSqlLoading(false);
    }
  }

  async function handleLoadSupabaseExport() {
    setOperating(true);
    try {
      const res = await fetch("/api/v1/admin/db/supabase-export");
      const data = await res.json();
      if (res.ok) {
        setSupabaseSql(data.sql);
      }
    } catch (_) {
    } finally {
      setOperating(false);
    }
  }

  async function handleBackup() {
    setOperating(true);
    setActionMsg(null);
    try {
      const res = await fetch("/api/v1/admin/db/backup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setActionMsg({ type: "success", text: `Database backup created: ${data.backup_path}` });
      } else {
        throw new Error(data.detail || "Backup failed");
      }
    } catch (e: any) {
      setActionMsg({ type: "error", text: e.message });
    } finally {
      setOperating(false);
    }
  }

  async function handleVacuum() {
    setOperating(true);
    setActionMsg(null);
    try {
      const res = await fetch("/api/v1/admin/db/vacuum", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setActionMsg({ type: "success", text: "Database vacuum & defragmentation completed successfully!" });
        fetchStats();
      } else {
        throw new Error(data.detail || "Vacuum failed");
      }
    } catch (e: any) {
      setActionMsg({ type: "error", text: e.message });
    } finally {
      setOperating(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setOperating(true);
    try {
      const res = await fetch("/api/v1/admin/db/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newUserEmail, full_name: newUserName, password: newUserPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg({ type: "success", text: `User ${newUserEmail} created with private storage folder!` });
        setShowAddUser(false);
        setNewUserEmail("");
        setNewUserName("");
        setNewUserPassword("");
        fetchStats();
        fetchTablesList();
      } else {
        throw new Error(data.detail || "Failed to create user");
      }
    } catch (e: any) {
      setActionMsg({ type: "error", text: e.message });
    } finally {
      setOperating(false);
    }
  }

  async function handleSwitchProvider(provider: "local" | "supabase") {
    setOperating(true);
    setActionMsg(null);
    try {
      const res = await fetch("/api/v1/admin/db/switch-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          database_url: provider === "supabase" ? supabaseUri : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg({ type: "success", text: data.message });
        fetchProvider();
        fetchStats();
        fetchTablesList();
      } else {
        throw new Error(data.detail || "Failed to switch database provider");
      }
    } catch (e: any) {
      setActionMsg({ type: "error", text: e.message });
    } finally {
      setOperating(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetEmail) return;
    setOperating(true);
    try {
      const res = await fetch("/api/v1/admin/db/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, new_password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg({ type: "success", text: `Password updated for ${resetEmail}!` });
        setResetEmail(null);
        setNewPassword("");
      } else {
        throw new Error(data.detail || "Password reset failed");
      }
    } catch (e: any) {
      setActionMsg({ type: "error", text: e.message });
    } finally {
      setOperating(false);
    }
  }

  async function handleDeleteUser() {
    if (!deleteEmail) return;
    setOperating(true);
    try {
      const res = await fetch(`/api/v1/admin/db/users/${encodeURIComponent(deleteEmail)}?wipe_data=${wipeUploads}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg({ type: "success", text: `User ${deleteEmail} and scan records deleted.` });
        setDeleteEmail(null);
        fetchStats();
        fetchTablesList();
      } else {
        throw new Error(data.detail || "Delete failed");
      }
    } catch (e: any) {
      setActionMsg({ type: "error", text: e.message });
    } finally {
      setOperating(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass p-6 rounded-2xl border border-emerald-500/20 shadow-xl bg-gradient-to-r from-emerald-950/30 to-slate-900/60">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Database size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                Database Control Center
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {providerInfo?.engine || "SQLite 3 (Laptop Server)"}
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Full control over users, tables, custom queries, backups, and Supabase free cloud migration.
              </p>
            </div>
          </div>
        </div>

        {/* Global Control Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 transition"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={handleBackup}
            disabled={operating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 transition"
          >
            <Download size={14} />
            Backup .db
          </button>
          <button
            onClick={handleVacuum}
            disabled={operating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/30 transition"
          >
            <Sparkles size={14} />
            Vacuum DB
          </button>
          <button
            onClick={() => setShowAddUser(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 transition"
          >
            <UserPlus size={14} />
            Add User
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMsg && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-3 border ${
          actionMsg.type === "success" 
            ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200" 
            : "bg-red-950/40 border-red-500/40 text-red-200"
        }`}>
          {actionMsg.type === "success" ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> : <AlertCircle size={16} className="text-red-400 shrink-0" />}
          <span className="font-medium">{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="ml-auto text-gray-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* Navigation Tabs (Supabase Studio Style) */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === "overview"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Activity size={14} />
          Overview & Users
        </button>
        <button
          onClick={() => setActiveTab("tables")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === "tables"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Table size={14} />
          Table Editor (Supabase-Style)
        </button>
        <button
          onClick={() => setActiveTab("sql")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === "sql"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Terminal size={14} />
          SQL Query Editor
        </button>
        <button
          onClick={() => {
            setActiveTab("supabase");
            if (!supabaseSql) handleLoadSupabaseExport();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === "supabase"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Cloud size={14} />
          Free Supabase Integration
        </button>
      </div>

      {/* TAB 1: OVERVIEW & USERS */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="glass p-4 rounded-xl border border-white/5">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="text-[11px] font-medium">Total Users</span>
                  <Users size={15} className="text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-white">{stats.total_users}</div>
                <div className="text-[10px] text-gray-500 mt-1">Separate Accounts</div>
              </div>

              <div className="glass p-4 rounded-xl border border-white/5">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="text-[11px] font-medium">Total Scans</span>
                  <Activity size={15} className="text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-white">{stats.total_scans}</div>
                <div className="text-[10px] text-gray-500 mt-1">AI Crop Screenings</div>
              </div>

              <div className="glass p-4 rounded-xl border border-white/5">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="text-[11px] font-medium">Database File</span>
                  <HardDrive size={15} className="text-amber-400" />
                </div>
                <div className="text-xl font-bold text-white">{stats.database_size_formatted}</div>
                <div className="text-[10px] text-gray-500 mt-1 truncate" title={stats.database_path}>
                  agriguard.db
                </div>
              </div>

              <div className="glass p-4 rounded-xl border border-white/5">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="text-[11px] font-medium">Uploads Storage</span>
                  <ImageIcon size={15} className="text-purple-400" />
                </div>
                <div className="text-xl font-bold text-white">{stats.total_uploads_formatted}</div>
                <div className="text-[10px] text-gray-500 mt-1">All Crop Images</div>
              </div>

              <div className="glass p-4 rounded-xl border border-white/5">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="text-[11px] font-medium">Crop Catalog</span>
                  <ShieldCheck size={15} className="text-green-400" />
                </div>
                <div className="text-2xl font-bold text-white">{stats.total_crops}</div>
                <div className="text-[10px] text-gray-500 mt-1">{stats.total_diseases} Plant Diseases</div>
              </div>

              <div className="glass p-4 rounded-xl border border-white/5">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="text-[11px] font-medium">IoT Sensors</span>
                  <Server size={15} className="text-cyan-400" />
                </div>
                <div className="text-2xl font-bold text-white">{stats.total_sensor_readings}</div>
                <div className="text-[10px] text-gray-500 mt-1">Telemetry Points</div>
              </div>
            </div>
          )}

          {/* Users Directory Table */}
          <div className="glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users size={16} className="text-emerald-400" />
                  Registered User Accounts ({stats?.users.length || 0})
                </h2>
                <p className="text-[11px] text-gray-400">
                  Every user has isolated data and their own private disk storage under <code className="text-emerald-300">backend/uploads/users/&lt;username&gt;</code>
                </p>
              </div>
              <span className="text-[11px] text-gray-500 hidden sm:inline">
                CLI Control: <code className="bg-black/40 px-2 py-0.5 rounded text-emerald-400">python db_control.py stats</code>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-gray-400 uppercase text-[10px] tracking-wider border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4 text-center">Total Scans</th>
                    <th className="py-3 px-4 text-center">Health Breakdown</th>
                    <th className="py-3 px-4">Disk Storage</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {stats?.users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-4 font-medium text-white flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-300">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold">{u.full_name}</div>
                          <div className="text-[10px] text-gray-500 font-mono">@{u.username}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-300">
                        {u.email}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full font-bold bg-white/5 text-white">
                          {u.total_scans}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {u.scans_healthy} Healthy
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                            {u.scans_diseased} Disease
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {u.scans_uncertain} Uncertain
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{u.storage_formatted}</div>
                        <div className="text-[10px] text-gray-500">{u.files_count} photo file{u.files_count === 1 ? "" : "s"}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-[11px]">
                        {u.created_at.split(".")[0]}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setResetEmail(u.email);
                            setNewPassword("");
                          }}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
                          title="Reset Password"
                        >
                          <KeyRound size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteEmail(u.email)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition"
                          title="Delete User"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUPABASE-STYLE TABLE EDITOR */}
      {activeTab === "tables" && (
        <div className="glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400">Select Table:</span>
              <select
                value={selectedTable}
                onChange={(e) => {
                  setSelectedTable(e.target.value);
                  fetchTableContent(e.target.value, tableSearch);
                }}
                className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-semibold outline-none focus:border-emerald-500"
              >
                {tablesList.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} ({t.count} rows)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter rows..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") fetchTableContent(selectedTable, tableSearch);
                  }}
                  className="pl-9 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-emerald-500 w-48 sm:w-64"
                />
              </div>
              <button
                onClick={() => fetchTableContent(selectedTable, tableSearch)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
              >
                Search
              </button>
            </div>
          </div>

          {tableLoading ? (
            <div className="py-12 text-center text-gray-400 text-xs">Loading table data...</div>
          ) : tableData && tableData.rows.length > 0 ? (
            <div className="overflow-x-auto border border-white/5 rounded-xl max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 sticky top-0 text-gray-400 uppercase text-[10px] tracking-wider border-b border-white/5">
                  <tr>
                    {tableData.columns.map((c) => (
                      <th key={c} className="py-2.5 px-3 whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300 font-mono text-[11px]">
                  {tableData.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-white/[0.02]">
                      {tableData.columns.map((col) => (
                        <td key={col} className="py-2 px-3 whitespace-nowrap max-w-xs truncate" title={String(row[col])}>
                          {row[col] === null ? (
                            <span className="text-gray-600 italic">null</span>
                          ) : typeof row[col] === "boolean" ? (
                            <span className={row[col] ? "text-emerald-400" : "text-gray-500"}>
                              {String(row[col])}
                            </span>
                          ) : (
                            String(row[col])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500 text-xs">No records found for table '{selectedTable}'.</div>
          )}
        </div>
      )}

      {/* TAB 3: SQL QUERY EDITOR */}
      {activeTab === "sql" && (
        <div className="glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl p-6 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal size={16} className="text-emerald-400" />
              Interactive SQL Console
            </h2>
            <p className="text-[11px] text-gray-400">
              Run raw SQL queries against your database engine (like in Supabase SQL Editor).
            </p>
          </div>

          <div className="space-y-2">
            <textarea
              rows={4}
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              className="w-full p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-emerald-300 outline-none focus:border-emerald-500"
              placeholder="SELECT * FROM crops LIMIT 5;"
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSqlQuery("SELECT id, email, full_name, created_at FROM users;")}
                  className="px-2.5 py-1 rounded-lg bg-white/5 text-[10px] text-gray-400 hover:text-white"
                >
                  Quick: Users
                </button>
                <button
                  type="button"
                  onClick={() => setSqlQuery("SELECT id, user_id, crop_id, is_healthy, status FROM scans LIMIT 10;")}
                  className="px-2.5 py-1 rounded-lg bg-white/5 text-[10px] text-gray-400 hover:text-white"
                >
                  Quick: Scans
                </button>
                <button
                  type="button"
                  onClick={() => setSqlQuery("SELECT * FROM crops;")}
                  className="px-2.5 py-1 rounded-lg bg-white/5 text-[10px] text-gray-400 hover:text-white"
                >
                  Quick: Crops
                </button>
              </div>

              <button
                onClick={handleRunSql}
                disabled={sqlLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/40 transition"
              >
                <Play size={13} />
                Run Query
              </button>
            </div>
          </div>

          {/* Results Box */}
          {sqlResult && (
            <div className="space-y-2 border-t border-white/5 pt-4">
              <div className="text-xs font-semibold text-gray-300">
                {sqlResult.status === "success" ? (
                  <span className="text-emerald-400">
                    Query completed successfully ({sqlResult.count || sqlResult.rows_affected || 0} rows)
                  </span>
                ) : (
                  <span className="text-red-400">SQL Error: {sqlResult.error}</span>
                )}
              </div>

              {sqlResult.rows && sqlResult.rows.length > 0 && (
                <div className="overflow-x-auto border border-white/5 rounded-xl max-h-[400px]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-white/5 sticky top-0 text-gray-400 text-[10px] uppercase">
                      <tr>
                        {sqlResult.columns.map((c: string) => (
                          <th key={c} className="py-2 px-3 whitespace-nowrap">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-200 text-[11px]">
                      {sqlResult.rows.map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          {sqlResult.columns.map((col: string) => (
                            <td key={col} className="py-1.5 px-3 whitespace-nowrap">
                              {String(r[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FREE SUPABASE CLOUD INTEGRATION */}
      {activeTab === "supabase" && (
        <div className="glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl p-6 space-y-6">
          {/* Header & Project Info */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Cloud size={20} className="text-emerald-400" />
                <h2 className="text-base font-bold text-white">AgriGuard Project (Supabase)</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                  Ref: todwosflbwzuizvedouy
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Connected to project dashboard. You can keep your laptop as the server while storing data in Supabase free cloud PostgreSQL!
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="https://supabase.com/dashboard/project/todwosflbwzuizvedouy/sql/new"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition"
              >
                <Terminal size={12} />
                Open SQL Editor
                <ExternalLink size={11} />
              </a>
              <a
                href="https://supabase.com/dashboard/project/todwosflbwzuizvedouy/settings/database"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-medium border border-white/10 transition"
              >
                Database Settings
                <ExternalLink size={11} />
              </a>
            </div>
          </div>

          {/* Active Engine Badge */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
            <div className="flex items-center gap-2.5">
              <div className={`w-2.5 h-2.5 rounded-full ${providerInfo?.is_cloud ? "bg-emerald-400 animate-pulse" : "bg-blue-400"}`} />
              <div>
                <span className="text-gray-400 text-[11px] block">Current Active Database Engine:</span>
                <span className="font-bold text-white text-xs">
                  {providerInfo?.engine || "SQLite 3 (Local Laptop Server)"}
                </span>
              </div>
            </div>
            
            {providerInfo?.is_cloud ? (
              <button
                onClick={() => handleSwitchProvider("local")}
                disabled={operating}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 text-xs font-medium border border-amber-500/20 transition"
              >
                Switch back to Local SQLite
              </button>
            ) : (
              <span className="text-[11px] text-gray-500">
                Laptop is primary server & database
              </span>
            )}
          </div>

          {/* 3-Step Supabase Setup Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400">Step 1: SQL Migration</span>
                <a 
                  href="https://supabase.com/dashboard/project/todwosflbwzuizvedouy/sql/new"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-emerald-400 underline flex items-center gap-0.5"
                >
                  Open SQL Editor <ExternalLink size={9} />
                </a>
              </div>
              <p className="text-gray-400 text-[11px]">
                Copy the pre-generated migration script below and run it in the Supabase SQL Editor to create all 6 tables and populate current data.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400">Step 2: Get Connection URI</span>
                <a 
                  href="https://supabase.com/dashboard/project/todwosflbwzuizvedouy/settings/database"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-emerald-400 underline flex items-center gap-0.5"
                >
                  Settings <ExternalLink size={9} />
                </a>
              </div>
              <p className="text-gray-400 text-[11px]">
                Go to Database Settings, scroll down to <strong>Connection string &rarr; URI</strong> and copy your connection string with your password.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
              <span className="font-bold text-emerald-400">Step 3: Connect With 1-Click</span>
              <p className="text-gray-400 text-[11px]">
                Paste your Supabase URI into the connection box below and click <strong>Verify & Connect</strong>. AgriGuard connects instantly!
              </p>
            </div>
          </div>

          {/* Switch Connection Form */}
          <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Server size={13} className="text-emerald-400" />
                Connect AgriGuard Directly to Supabase
              </span>
              <span className="text-[10px] text-gray-400">
                Supports Direct URI or Session Pooler
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="postgresql://postgres:[YOUR-PASSWORD]@db.todwosflbwzuizvedouy.supabase.co:5432/postgres"
                value={supabaseUri}
                onChange={(e) => setSupabaseUri(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 font-mono outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => handleSwitchProvider("supabase")}
                disabled={operating || !supabaseUri.trim()}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-emerald-900/40 transition whitespace-nowrap"
              >
                <CheckCircle2 size={13} />
                Verify &amp; Switch
              </button>
            </div>
            <p className="text-[10px] text-gray-500">
              Note: The database password is never exposed in client requests. Testing happens securely on your backend server.
            </p>
          </div>

          {/* Generated Supabase SQL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-300 block">
                  One-Click Supabase DDL &amp; Data Migration Script
                </span>
                <span className="text-[10px] text-gray-500">
                  Contains all 5 users, 14 crops, 48 disease classes, 26 scans, 117 sensor readings
                </span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(supabaseSql);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 2000);
                }}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
              >
                <Copy size={13} />
                {copiedSql ? "Copied!" : "Copy SQL Script"}
              </button>
            </div>

            <textarea
              readOnly
              rows={8}
              value={supabaseSql || "Generating script..."}
              className="w-full p-3 rounded-xl bg-black/70 border border-white/10 font-mono text-[11px] text-gray-300 outline-none"
            />
          </div>
        </div>
      )}

      {/* CLI Quick Reference Box */}
      <div className="glass p-5 rounded-2xl border border-white/5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-200 uppercase tracking-wider">
          <Server size={14} className="text-emerald-400" />
          Terminal Database Control (Run on Laptop Anytime)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono text-gray-400">
          <div className="p-2 rounded-lg bg-black/40 border border-white/5">
            <span className="text-emerald-400 font-bold">python db_control.py stats</span>
            <p className="text-[10px] text-gray-500 mt-0.5">Show table counts, users, and disk space usage</p>
          </div>
          <div className="p-2 rounded-lg bg-black/40 border border-white/5">
            <span className="text-emerald-400 font-bold">python db_control.py backup</span>
            <p className="text-[10px] text-gray-500 mt-0.5">Instant safe snapshot to backend/backups/</p>
          </div>
          <div className="p-2 rounded-lg bg-black/40 border border-white/5">
            <span className="text-emerald-400 font-bold">python db_control.py reset-password &lt;email&gt; &lt;pw&gt;</span>
            <p className="text-[10px] text-gray-500 mt-0.5">Directly update any user password hash</p>
          </div>
          <div className="p-2 rounded-lg bg-black/40 border border-white/5">
            <span className="text-emerald-400 font-bold">python db_control.py export [users|scans|sensors]</span>
            <p className="text-[10px] text-gray-500 mt-0.5">Export database records directly to CSV files</p>
          </div>
        </div>
      </div>

      {/* Modal: Add User */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass p-6 rounded-2xl border border-emerald-500/30 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus size={18} className="text-emerald-400" />
              Create New User Account
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-gray-400">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="farmer@agriguard.in"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-400">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ramesh Patel"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-400">Password</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={operating}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {resetEmail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass p-6 rounded-2xl border border-white/10 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <KeyRound size={18} className="text-amber-400" />
              Reset User Password
            </h3>
            <p className="text-xs text-gray-400">
              Set a new secure password for <strong className="text-white">{resetEmail}</strong>:
            </p>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-gray-400">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetEmail(null)}
                  className="px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={operating}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete User Confirmation */}
      {deleteEmail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass p-6 rounded-2xl border border-red-500/30 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
              <Trash2 size={18} />
              Confirm Delete User
            </h3>
            <p className="text-xs text-gray-300">
              Are you sure you want to permanently remove <strong className="text-white">{deleteEmail}</strong> and all their scan history from the database?
            </p>
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={wipeUploads}
                onChange={(e) => setWipeUploads(e.target.checked)}
                className="rounded border-white/20 text-red-600 focus:ring-0"
              />
              Also wipe their uploaded images folder from disk
            </label>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteEmail(null)}
                className="px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={operating}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
