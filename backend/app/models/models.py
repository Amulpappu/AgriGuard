import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Float, Integer, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def gen_uuid() -> str:
    return str(uuid.uuid4())


# ─── User ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    scans: Mapped[list["Scan"]] = relationship("Scan", back_populates="user", lazy="select")


# ─── Crop ────────────────────────────────────────────────────────────────────

class Crop(Base):
    __tablename__ = "crops"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    # Display name stored as translation key
    name_key: Mapped[str] = mapped_column(String(64))
    icon_emoji: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)

    diseases: Mapped[list["Disease"]] = relationship("Disease", back_populates="crop", lazy="select")
    scans: Mapped[list["Scan"]] = relationship("Scan", back_populates="crop", lazy="select")


# ─── Disease ─────────────────────────────────────────────────────────────────

class Disease(Base):
    __tablename__ = "diseases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    crop_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("crops.id"), nullable=True
    )
    name_key: Mapped[str] = mapped_column(String(64))
    # PlantVillage class label
    class_label: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    crop: Mapped[Optional["Crop"]] = relationship("Crop", back_populates="diseases")
    scans: Mapped[list["Scan"]] = relationship("Scan", back_populates="disease", lazy="select")


# ─── Scan ────────────────────────────────────────────────────────────────────

class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    crop_id: Mapped[str] = mapped_column(String(36), ForeignKey("crops.id"))
    image_url: Mapped[str] = mapped_column(String(512))
    thumb_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    is_healthy: Mapped[bool] = mapped_column(Boolean, default=False)
    disease_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("diseases.id"), nullable=True
    )
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    top3: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    severity: Mapped[str] = mapped_column(String(16), default="none")  # none/low/moderate/high
    severity_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    low_confidence: Mapped[bool] = mapped_column(Boolean, default=False)
    model_version: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    # status: healthy | potentially_diseased | uncertain
    status: Mapped[str] = mapped_column(String(32), default="uncertain")
    crop_auto_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    condition_type: Mapped[str] = mapped_column(String(32), default="disease")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped["User"] = relationship("User", back_populates="scans")
    crop: Mapped["Crop"] = relationship("Crop", back_populates="scans")
    disease: Mapped[Optional["Disease"]] = relationship("Disease", back_populates="scans")


# ─── Device ──────────────────────────────────────────────────────────────────

class Device(Base):
    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(128))
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    readings: Mapped[list["SensorReading"]] = relationship(
        "SensorReading", back_populates="device", lazy="select"
    )


# ─── SensorReading ────────────────────────────────────────────────────────────

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String(36), ForeignKey("devices.id"), index=True)
    soil_moisture: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    temp_c: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    humidity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True
    )

    device: Mapped["Device"] = relationship("Device", back_populates="readings")
