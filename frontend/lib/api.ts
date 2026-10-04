/**
 * API client for AgriGuard backend.
 * All requests include Authorization header when token is available.
 */

export function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    // In browser/mobile app, use relative URL so Next.js rewrites proxy to backend
    return "";
  }
  return "http://127.0.0.1:8001";
}

const getApiPrefix = () => `${getApiBase()}/api/v1`;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  full_name?: string;
}

export interface CropOut {
  id: string;
  slug: string;
  name_key: string;
  icon_emoji?: string;
}

export interface DiseaseOut {
  id: string;
  slug: string;
  name_key: string;
  crop_id?: string;
}

export interface Top3Item {
  disease_id?: string;
  disease_slug: string;
  disease_name_key: string;
  confidence: number;
}

export interface SeverityOut {
  level: "none" | "low" | "moderate" | "high";
  affected_pct?: number;
  is_estimate: boolean;
}

export interface ScanOut {
  id: string;
  crop: CropOut;
  status: "healthy" | "potentially_diseased" | "uncertain";
  disease?: DiseaseOut;
  confidence: number;
  low_confidence: boolean;
  top3?: Top3Item[];
  severity: SeverityOut;
  model_version?: string;
  image_url: string;
  thumb_url?: string;
  created_at: string;
  crop_auto_detected?: boolean;
  condition_type?: string;
}

export interface ScanListItem {
  id: string;
  crop: CropOut;
  status: string;
  disease?: DiseaseOut;
  confidence: number;
  severity: SeverityOut;
  created_at: string;
  image_url: string;
  thumb_url?: string;
}

export interface CompareOut {
  scan_a: ScanOut;
  scan_b: ScanOut;
  severity_delta?: number;
  confidence_delta: number;
  status_change: boolean;
}

export interface DashboardSummary {
  total_scans: number;
  healthy_count: number;
  affected_count: number;
  uncertain_count: number;
  recent_scans: ScanListItem[];
  chart_data: Array<{
    date: string;
    crop_slug: string;
    affected_pct: number;
    status: string;
  }>;
}

export interface AdvisoryOut {
  disease_id: string;
  name: string;
  summary: string;
  category?: string;
  emergency_action?: string;
  organic_solution?: string;
  soil_and_water?: string;
  symptoms: string[];
  prevention: string[];
  management: string[];
  seek_help_when: string[];
  severity_notes: Record<string, string>;
  sources: string[];
  reviewed_by?: string;
  disclaimer: string;
}

export interface SensorLatestOut {
  latest?: {
    id: number;
    device_id: string;
    soil_moisture?: number;
    temp_c?: number;
    humidity?: number;
    recorded_at: string;
  };
  series: Array<{
    id: number;
    device_id: string;
    soil_moisture?: number;
    temp_c?: number;
    humidity?: number;
    recorded_at: string;
  }>;
  context_hint?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("agriguard_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = err?.detail;
    if (typeof detail === "object" && detail?.code) {
      throw { code: detail.code, message: detail.message || res.statusText };
    }
    throw { code: "api_error", message: typeof detail === "string" ? detail : res.statusText };
  }
  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${getApiPrefix()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<TokenResponse>(res);
}

export async function register(email: string, password: string, fullName?: string): Promise<TokenResponse> {
  const res = await fetch(`${getApiPrefix()}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
  return handleResponse<TokenResponse>(res);
}

// ─── Crops ───────────────────────────────────────────────────────────────────

export async function getCrops(): Promise<CropOut[]> {
  const res = await fetch(`${getApiPrefix()}/crops`, { headers: authHeaders() });
  return handleResponse<CropOut[]>(res);
}

// ─── Scans ───────────────────────────────────────────────────────────────────

export async function createScan(cropId: string | null | undefined, imageFile: File): Promise<ScanOut> {
  const form = new FormData();
  if (cropId && cropId !== "auto") {
    form.append("crop_id", cropId);
  } else {
    form.append("crop_id", "auto");
  }
  form.append("image", imageFile);
  const res = await fetch(`${getApiPrefix()}/scans`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  return handleResponse<ScanOut>(res);
}

export async function getScans(params?: {
  crop?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<ScanListItem[]> {
  const q = new URLSearchParams();
  if (params?.crop) q.set("crop", params.crop);
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  if (params?.limit) q.set("limit", String(params.limit));
  const res = await fetch(`${getApiPrefix()}/scans?${q}`, { headers: authHeaders() });
  return handleResponse<ScanListItem[]>(res);
}

export async function getScan(id: string): Promise<ScanOut> {
  const res = await fetch(`${getApiPrefix()}/scans/${id}`, { headers: authHeaders() });
  return handleResponse<ScanOut>(res);
}

export async function compareScans(a: string, b: string): Promise<CompareOut> {
  const res = await fetch(`${getApiPrefix()}/scans/compare?a=${a}&b=${b}`, {
    headers: authHeaders(),
  });
  return handleResponse<CompareOut>(res);
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const res = await fetch(`${getApiPrefix()}/dashboard/summary`, { headers: authHeaders() });
  return handleResponse<DashboardSummary>(res);
}

// ─── Advisory ────────────────────────────────────────────────────────────────

export async function getAdvisory(diseaseId: string, lang = "en"): Promise<AdvisoryOut> {
  const res = await fetch(`${getApiPrefix()}/advisory/${diseaseId}?lang=${lang}`, {
    headers: authHeaders(),
  });
  return handleResponse<AdvisoryOut>(res);
}

// ─── Sensors ─────────────────────────────────────────────────────────────────

export async function getSensorLatest(): Promise<SensorLatestOut> {
  const res = await fetch(`${getApiPrefix()}/sensors/latest`, { headers: authHeaders() });
  return handleResponse<SensorLatestOut>(res);
}

// ─── Image downscaling (client-side before upload) ────────────────────────────

export async function downscaleImage(file: File, maxPx = 1280): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      if (width <= maxPx && height <= maxPx) {
        resolve(file);
        return;
      }
      const scale = maxPx / Math.max(width, height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Canvas blob failed")); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.88
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}
