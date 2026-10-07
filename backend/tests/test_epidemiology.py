"""
Unit tests for AgriGuard Epiphytology, BioRadar, and Mandi PHI ROI engine.
"""
import pytest
from app.services.epidemiology import (
    calculate_vpd,
    evaluate_pre_symptomatic_risk,
    calculate_village_bioradar,
    evaluate_mandi_phi_roi,
)


def test_vpd_calculation():
    res = calculate_vpd(25.0, 80.0)
    assert res["vpd_kpa"] > 0.0
    assert res["dew_point_c"] <= 25.0
    assert "svp_kpa" in res
    assert "avp_kpa" in res


def test_pre_symptomatic_high_humidity_risk():
    # Warm + high humidity -> critical infection window
    res = evaluate_pre_symptomatic_risk(24.0, 95.0, 80.0)
    assert res["risk_percentage"] >= 60.0
    assert "prophylactic_bio_action" in res
    assert res["hours_to_germination"] <= 48
    assert res["economic_benefits"]["net_savings_per_acre_inr"] > 1000


def test_pre_symptomatic_dry_resilient_risk():
    # Dry conditions -> low risk
    res = evaluate_pre_symptomatic_risk(32.0, 35.0, 30.0)
    assert res["risk_percentage"] < 40.0
    assert res["risk_level"] == "OPTIMAL_RESILIENT"


def test_village_bioradar_dispersion():
    radar = calculate_village_bioradar(
        wind_speed_kmh=15.0,
        wind_direction_deg=230.0,
        source_risk_pct=88.0,
    )
    assert radar["nodes_monitored"] > 0
    assert "wind_vector" in radar
    assert any(n["in_plume_zone"] for n in radar["cluster_nodes"])


def test_mandi_phi_roi_mrl_lock():
    # 5 days to harvest for tomato (14 days chemical PHI) -> MRL lock must trigger
    roi = evaluate_mandi_phi_roi("tomato", days_to_harvest=5, mandi_price_per_kg=30.0)
    assert roi["has_mrl_safety_lock"] is True
    assert roi["farmer_profit_difference_inr"] > 0
    assert roi["scenarios"]["chemical_spray"]["mrl_status"] == "VIOLATION_REJECTED"
    assert roi["scenarios"]["bio_shield_prophylactic"]["mrl_status"] == "100% EXPORT_SAFE"
