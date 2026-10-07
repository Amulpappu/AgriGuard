from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field, field_validator


# ─── Auth ────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    is_lohith: bool = False


# ─── Crop ────────────────────────────────────────────────────────────────────

class CropOut(BaseModel):
    id: str
    slug: str
    name_key: str
    icon_emoji: Optional[str] = None

    model_config = {"from_attributes": True}


# ─── Disease ─────────────────────────────────────────────────────────────────

class DiseaseOut(BaseModel):
    id: str
    slug: str
    name_key: str
    crop_id: Optional[str] = None

    model_config = {"from_attributes": True}


# ─── Scan ────────────────────────────────────────────────────────────────────

class Top3Item(BaseModel):
    disease_id: Optional[str] = None
    disease_slug: str
    disease_name_key: str
    confidence: float


class SeverityOut(BaseModel):
    level: str  # none | low | moderate | high
    affected_pct: Optional[float] = None
    is_estimate: bool = True


class ScanOut(BaseModel):
    id: str
    crop: CropOut
    status: str  # healthy | potentially_diseased | uncertain
    disease: Optional[DiseaseOut] = None
    confidence: float
    low_confidence: bool
    top3: Optional[List[Top3Item]] = None
    severity: SeverityOut
    model_version: Optional[str] = None
    image_url: str
    thumb_url: Optional[str] = None
    created_at: datetime
    crop_auto_detected: bool = False
    condition_type: str = "disease"

    model_config = {"from_attributes": True}


class ScanListItem(BaseModel):
    id: str
    crop: CropOut
    status: str
    disease: Optional[DiseaseOut] = None
    confidence: float
    severity: SeverityOut
    created_at: datetime
    image_url: str
    thumb_url: Optional[str] = None

    model_config = {"from_attributes": True}


class CompareOut(BaseModel):
    scan_a: ScanOut
    scan_b: ScanOut
    severity_delta: Optional[float] = None
    confidence_delta: float
    status_change: bool


# ─── Dashboard ───────────────────────────────────────────────────────────────

class DashboardSummary(BaseModel):
    total_scans: int
    healthy_count: int
    affected_count: int
    uncertain_count: int
    recent_scans: List[ScanListItem]
    chart_data: List[dict]  # [{date, crop_slug, affected_pct}]


# ─── Sensor ──────────────────────────────────────────────────────────────────

class SensorReadingIn(BaseModel):
    soil_moisture: Optional[float] = Field(None, ge=0, le=100)
    temp_c: Optional[float] = Field(None, ge=-10, le=60)
    humidity: Optional[float] = Field(None, ge=0, le=100)
    recorded_at: Optional[datetime] = None


class SensorReadingOut(BaseModel):
    id: int
    device_id: str
    soil_moisture: Optional[float] = None
    temp_c: Optional[float] = None
    humidity: Optional[float] = None
    recorded_at: datetime

    model_config = {"from_attributes": True}


class SensorLatestOut(BaseModel):
    latest: Optional[SensorReadingOut] = None
    series: List[SensorReadingOut] = []
    context_hint: Optional[str] = None


# ─── Advisory ────────────────────────────────────────────────────────────────

class AdvisoryOut(BaseModel):
    disease_id: str
    name: str
    summary: str
    category: Optional[str] = "Pathological Disease"
    emergency_action: Optional[str] = None
    organic_solution: Optional[str] = None
    soil_and_water: Optional[str] = None
    symptoms: List[str] = []
    prevention: List[str] = []
    management: List[str] = []
    seek_help_when: List[str] = []
    severity_notes: dict = {}
    sources: List[str] = []
    reviewed_by: Optional[str] = None
    disclaimer: str = (
        "Consult your local agriculture officer or Krishi Vigyan Kendra (KVK) for treatment."
    )


# ─── Health ──────────────────────────────────────────────────────────────────

class HealthOut(BaseModel):
    status: str = "ok"
    model_backend: str
    model_version: Optional[str] = None
    db: str = "ok"
