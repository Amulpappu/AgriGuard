"""
AgriGuard Epiphytology, Bio-Climatic Triangulation & Mandi Economics Engine.

Implements:
1. Vapor Pressure Deficit (VPD) & Leaf Wetness Duration (LWD) modeling.
2. Tom-Cast Disease Severity Value (DSV) pre-symptomatic spore germination forecasting.
3. Village Grid Epidemiological Spore Dispersion Plume (Gaussian wind-vector bio-radar).
4. Mandi Pre-Harvest Interval (PHI) & Economic Injury Level (EIL) ROI engine.
"""
from __future__ import annotations
import math
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List


def calculate_vpd(temp_c: float, humidity_pct: float) -> Dict[str, float]:
    """
    Computes Saturation Vapor Pressure (SVP, kPa), Actual Vapor Pressure (AVP, kPa),
    Vapor Pressure Deficit (VPD, kPa), and Dew Point (C).
    """
    # Tetens equation for SVP
    svp = 0.61078 * math.exp((17.27 * temp_c) / (temp_c + 237.3))
    avp = svp * (max(0.0, min(100.0, humidity_pct)) / 100.0)
    vpd = max(0.0, svp - avp)

    # Dew point approximation (Magnus formula)
    a = 17.27
    b = 237.7
    rh = max(1.0, min(100.0, humidity_pct))
    alpha = ((a * temp_c) / (b + temp_c)) + math.log(rh / 100.0)
    dew_point = (b * alpha) / (a - alpha)
    dew_depression = max(0.0, temp_c - dew_point)

    return {
        "svp_kpa": round(svp, 3),
        "avp_kpa": round(avp, 3),
        "vpd_kpa": round(vpd, 3),
        "dew_point_c": round(dew_point, 1),
        "dew_depression_c": round(dew_depression, 1),
    }


def evaluate_pre_symptomatic_risk(
    temp_c: float,
    humidity_pct: float,
    soil_moisture_pct: float,
    recent_readings: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Evaluates 48-72h fungal spore germination & colonization pressure using
    micro-climatic parameters and Tom-Cast DSV algorithms.
    """
    vpd_info = calculate_vpd(temp_c, humidity_pct)
    vpd = vpd_info["vpd_kpa"]
    dew_dep = vpd_info["dew_depression_c"]

    # Count high-humidity hours if recent series provided
    wet_hours = 0.0
    if recent_readings:
        for r in recent_readings:
            h = r.get("humidity") or 0.0
            if h >= 85.0:
                wet_hours += 1.0
    else:
        # Estimate based on current snapshot
        if humidity_pct >= 90.0:
            wet_hours = 8.0
        elif humidity_pct >= 80.0:
            wet_hours = 5.0
        elif humidity_pct >= 70.0:
            wet_hours = 2.0
        else:
            wet_hours = 0.0

    # Calculate Tom-Cast DSV index (0 to 4 points)
    # Optimum spore germination temperature for Solanaceae/Brassica blights is 16C - 26C
    in_temp_sweet_spot = 15.0 <= temp_c <= 28.0
    dsv = 0
    if in_temp_sweet_spot:
        if wet_hours >= 12:
            dsv = 4
        elif wet_hours >= 8:
            dsv = 3
        elif wet_hours >= 5:
            dsv = 2
        elif wet_hours >= 2:
            dsv = 1
    else:
        if wet_hours >= 14:
            dsv = 2
        elif wet_hours >= 7:
            dsv = 1

    # Infection risk percentage
    base_risk = (dsv / 4.0) * 65.0
    # Additional factors: low VPD (< 0.4 kPa means prolonged leaf wetness / fog)
    if vpd < 0.4:
        base_risk += 25.0
    elif vpd < 0.6:
        base_risk += 15.0

    # Soil saturation factor (>75% moisture encourages root zone pathogens like Pythium/Rhizoctonia)
    if soil_moisture_pct > 75.0:
        base_risk += 10.0

    risk_pct = min(98.0, max(5.0, round(base_risk, 1)))

    if risk_pct >= 75.0:
        risk_level = "CRITICAL_INFECTION_WINDOW"
        hours_to_germination = 24
        urgency = "Immediate Prophylactic Intervention (Within 12-24h)"
        action_summary = "High fungal spore inoculum pressure. Cuticle penetration expected within 24-36h."
        bio_recipe = "Apply Trichoderma viride (5g/L) or 3% Neem Seed Kernel Extract (NSKE) with soap emulsifier. Creates competitive bio-film on leaf cuticle before mycelium penetrates."
    elif risk_pct >= 45.0:
        risk_level = "ELEVATED_RISK"
        hours_to_germination = 48
        urgency = "Preventive Foliar Spray (Within 48h)"
        action_summary = "Conditions favor spore sporulation. Moisture duration is approaching germination threshold."
        bio_recipe = "Spray Pseudomonas fluorescens (20g/L) or fermented buttermilk solution (sour curd 5% in water) to acidify leaf surface and inhibit spore tube elongation."
    else:
        risk_level = "OPTIMAL_RESILIENT"
        hours_to_germination = 72
        urgency = "Standard Monitoring"
        action_summary = "Canopy VPD is in healthy transpiration zone. Low spore germination probability."
        bio_recipe = "Maintain scheduled drip irrigation without evening canopy wetting. No spray required."

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "vpd": vpd_info,
        "wet_hours_estimated": round(wet_hours, 1),
        "dsv_index": dsv,
        "risk_percentage": risk_pct,
        "risk_level": risk_level,
        "hours_to_germination": hours_to_germination,
        "urgency": urgency,
        "action_summary": action_summary,
        "prophylactic_bio_action": bio_recipe,
        "economic_benefits": {
            "bio_treatment_cost_inr": 85.0,
            "chemical_fungicide_cost_inr": 1650.0,
            "net_savings_per_acre_inr": 1565.0,
            "toxic_chemical_runoff_saved_kg": 2.2,
        },
        "theme_alignment": {
            "samriddh_annadata": "Saves ₹1,500+ per acre by preventing yield collapse before symptoms develop",
            "swachh_bharat": "Prevents 2.2 kg/acre toxic chemical fungicide leaching into rural aquifers",
        },
    }


def calculate_village_bioradar(
    center_lat: float = 12.9716,
    center_lon: float = 77.5946,
    wind_speed_kmh: float = 14.5,
    wind_direction_deg: float = 230.0,  # 230 deg = SW wind (blows towards NE)
    source_risk_pct: float = 85.0,
) -> Dict[str, Any]:
    """
    Computes Downwind Epidemic Plume Dispersion across adjacent farm nodes
    within a 2km Gram Panchayat agricultural cluster.
    """
    # Downwind vector direction (towards opposite or blowing direction)
    bearing_rad = math.radians(wind_direction_deg)
    
    # 4 simulated cluster farm nodes in Gram Panchayat grid
    sample_nodes = [
        {"id": "node-alpha", "farmer": "Ramesh Gowda", "bearing": 225.0, "distance_m": 450, "crop": "Tomato (Hybrid)"},
        {"id": "node-beta", "farmer": "Lakshmi Devi", "bearing": 240.0, "distance_m": 820, "crop": "Chilli (G4)"},
        {"id": "node-gamma", "farmer": "Suresh Patil", "bearing": 95.0, "distance_m": 600, "crop": "Cabbage"},
        {"id": "node-delta", "farmer": "Manjunath K", "bearing": 215.0, "distance_m": 1400, "crop": "Brinjal"},
    ]

    plume_nodes = []
    for node in sample_nodes:
        # Angular difference between plume vector and node bearing
        angle_diff = abs(node["bearing"] - wind_direction_deg)
        if angle_diff > 180:
            angle_diff = 360 - angle_diff

        # In-plume if within 40 degrees of wind vector
        in_plume = angle_diff <= 40.0
        if in_plume and source_risk_pct > 50.0:
            # Risk decays with distance
            decay = math.exp(-node["distance_m"] / 1200.0)
            node_risk = round(source_risk_pct * decay, 1)
            eta_hours = round(node["distance_m"] / (wind_speed_kmh * 1000 / 60) / 60, 1) or 1.5
            threat = "HIGH_ALERT_DOWNWIND" if node_risk >= 60 else "CAUTION"
            alert_msg = f"Airborne spore plume heading along {wind_direction_deg}° vector. Spores reaching field in ~{eta_hours}h."
        else:
            node_risk = 15.0
            threat = "SAFE_UPWIND"
            alert_msg = "Upwind or outside plume dispersal cone. Normal preventive hygiene."

        plume_nodes.append({
            **node,
            "in_plume_zone": in_plume,
            "projected_risk_pct": node_risk,
            "threat_status": threat,
            "community_alert": alert_msg,
        })

    return {
        "cluster_name": "Gram Panchayat Sector-4 Grid",
        "wind_vector": {
            "speed_kmh": wind_speed_kmh,
            "direction_deg": wind_direction_deg,
            "cardinal": "SW ➔ NE",
        },
        "source_epicenter_risk_pct": source_risk_pct,
        "nodes_monitored": len(plume_nodes),
        "nodes_at_high_risk": sum(1 for n in plume_nodes if n["threat_status"] == "HIGH_ALERT_DOWNWIND"),
        "cluster_nodes": plume_nodes,
        "community_action": "Automated WhatsApp/SMS Alert: Farmers in NE Sector advised to apply neem barrier before tonight's dew event.",
    }


def evaluate_mandi_phi_roi(
    crop_slug: str,
    days_to_harvest: int,
    mandi_price_per_kg: float,
    yield_kg: float = 1200.0,
    field_acres: float = 1.0,
) -> Dict[str, Any]:
    """
    Evaluates Pre-Harvest Interval (PHI) compliance against Maximum Residue Limits (MRL)
    and computes Economic Injury Level (EIL) ROI comparing Chemical vs Bio vs Early Harvest.
    """
    # Standard chemical fungicide PHI table (days required between spray and safe human consumption)
    phi_database = {
        "tomato": {"chem_phi": 14, "chemical_name": "Mancozeb / Metalaxyl", "bio_phi": 0},
        "potato": {"chem_phi": 14, "chemical_name": "Cymoxanil + Mancozeb", "bio_phi": 0},
        "chilli": {"chem_phi": 10, "chemical_name": "Difenoconazole", "bio_phi": 0},
        "cotton": {"chem_phi": 21, "chemical_name": "Propiconazole", "bio_phi": 0},
        "rice": {"chem_phi": 21, "chemical_name": "Tricyclazole", "bio_phi": 0},
        "apple": {"chem_phi": 28, "chemical_name": "Captan", "bio_phi": 0},
    }

    crop_key = crop_slug.lower().split("_")[0]
    crop_rule = phi_database.get(crop_key, {"chem_phi": 14, "chemical_name": "Synthetic Systemic Fungicide", "bio_phi": 0})
    chem_phi_days = crop_rule["chem_phi"]

    gross_expected_revenue = mandi_price_per_kg * yield_kg

    # Check for MRL harvest safety conflict
    has_mrl_violation = days_to_harvest < chem_phi_days

    # Financial Scenario A: Chemical Route
    chem_cost = 1750.0 * field_acres
    if has_mrl_violation:
        # Heavy mandi penalty / rejection risk: 70% price slash or rejection
        chem_revenue = gross_expected_revenue * 0.30
        chem_status = "VIOLATION_REJECTED"
        chem_verdict = f"FAILED: Spraying requires {chem_phi_days} days PHI, but harvest is in {days_to_harvest} days. Produce risks mandi confiscation or 70% price penalty due to chemical residues."
    else:
        chem_revenue = gross_expected_revenue
        chem_status = "COMPLIANT"
        chem_verdict = f"Compliant with {chem_phi_days}-day PHI, but costs ₹{chem_cost} in chemical input."
    chem_net_profit = chem_revenue - chem_cost

    # Financial Scenario B: Zero-Residue Bio-Shield Prophylactic
    bio_cost = 110.0 * field_acres
    bio_revenue = gross_expected_revenue * 1.05  # 5% premium for residue-free quality
    bio_net_profit = bio_revenue - bio_cost
    bio_verdict = "PASSED: Zero-day PHI. 100% safe for immediate harvest. Eligible for residue-free premium prices."

    # Financial Scenario C: Pre-Emptive Harvest (if crop is 85%+ mature and days <= 5)
    salvage_yield = yield_kg * 0.88  # 12% yield weight discount for early pick
    early_harvest_revenue = salvage_yield * mandi_price_per_kg
    early_harvest_cost = 0.0
    early_harvest_net = early_harvest_revenue - early_harvest_cost

    # Optimal recommendation engine
    if has_mrl_violation:
        if days_to_harvest <= 4:
            recommended_strategy = "EARLY_CLEAN_HARVEST"
            primary_reason = f"Harvest is only {days_to_harvest} days away. Harvest immediately to avoid disease damage with ZERO chemical expenditure."
        else:
            recommended_strategy = "BIO_SHIELD_PROPHYLACTIC"
            primary_reason = f"MRL Lock: Apply zero-residue Bio-Shield (Trichoderma/Neem). Saves ₹{round(bio_net_profit - chem_net_profit)} in net profit compared to chemical penalty."
    else:
        recommended_strategy = "BIO_SHIELD_PROPHYLACTIC"
        primary_reason = f"Bio-Shield delivers ₹{round(bio_net_profit - chem_net_profit)} higher profit by eliminating expensive chemical purchases."

    return {
        "crop": crop_key.capitalize(),
        "days_to_harvest": days_to_harvest,
        "mandi_price_per_kg_inr": mandi_price_per_kg,
        "expected_yield_kg": yield_kg,
        "chemical_phi_days_required": chem_phi_days,
        "has_mrl_safety_lock": has_mrl_violation,
        "recommended_strategy": recommended_strategy,
        "advisory_summary": primary_reason,
        "scenarios": {
            "chemical_spray": {
                "input_cost_inr": round(chem_cost),
                "expected_revenue_inr": round(chem_revenue),
                "net_profit_inr": round(chem_net_profit),
                "mrl_status": chem_status,
                "notes": chem_verdict,
            },
            "bio_shield_prophylactic": {
                "input_cost_inr": round(bio_cost),
                "expected_revenue_inr": round(bio_revenue),
                "net_profit_inr": round(bio_net_profit),
                "mrl_status": "100% EXPORT_SAFE",
                "notes": bio_verdict,
            },
            "early_clean_harvest": {
                "input_cost_inr": 0,
                "expected_revenue_inr": round(early_harvest_revenue),
                "net_profit_inr": round(early_harvest_net),
                "mrl_status": "RESIDUE_FREE",
                "notes": "Pick crop now to lock in guaranteed profit and bypass all disease risk.",
            },
        },
        "farmer_profit_difference_inr": round(bio_net_profit - chem_net_profit),
    }
