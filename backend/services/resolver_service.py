"""
Resolver Service — Autonomous collision resolution and negotiation logging.
"""
import hashlib
from typing import Dict, Any

from config import MONITORING_THRESHOLD_KM
from services.maneuver_service import simulate_altitude_change
from services.collision_service import predict_closest_approaches

def get_priority_score(satellite_name: str) -> tuple[int, str]:
    """
    Returns (score, tier) based on satellite name classification.
    """
    upper_name = satellite_name.upper()
    
    # Crewed priority
    if any(x in upper_name for x in ["ISS", "CSS", "TIANHE", "SHENZHOU", "ZARYA", "POISK", "DRAGON", "SOYUZ"]):
        return (100, "CREWED")
        
    # Science / Gov priority
    if any(x in upper_name for x in ["HUBBLE", "GOES", "NOAA", "METOP", "LANDSAT", "AQUA", "TERRA", "JWST"]):
        return (80, "SCIENCE")
        
    # Commercial priority
    if any(x in upper_name for x in ["STARLINK", "ONEWEB", "IRIDIUM", "PLANET", "SPIRE", "GLOBALSTAR"]):
        return (60, "COMMERCIAL")
        
    # Default
    return (40, "DEFAULT")


def get_fuel_state(norad_id: int) -> float:
    """
    Deterministic fuel mock (0.0 to 100.0) based on NORAD ID hash.
    This simulates proprietary fuel levels for the prediction engine.
    """
    hash_obj = hashlib.md5(str(norad_id).encode())
    # Take first 4 bytes as int
    hash_int = int.from_bytes(hash_obj.digest()[:4], byteorder='big')
    # modulo 1000 for 0-999, then divide by 10 format float up to 100.0
    # map to 15.0 - 95.0 to avoid weird Edge cases of exactly 0 or 100
    base = (hash_int % 800) / 10.0
    return round(15.0 + base, 1)


def determine_maneuver_target(sat1: dict, sat2: dict) -> tuple[dict, dict, list]:
    """
    Decides which satellite should maneuver.
    Returns (yielding_sat, maintaining_sat, log_entries)
    """
    name1 = sat1.get("OBJECT_NAME", "UNKNOWN")
    name2 = sat2.get("OBJECT_NAME", "UNKNOWN")
    id1 = sat1.get("NORAD_CAT_ID", 0)
    id2 = sat2.get("NORAD_CAT_ID", 0)
    
    score1, tier1 = get_priority_score(name1)
    score2, tier2 = get_priority_score(name2)
    
    fuel1 = get_fuel_state(id1)
    fuel2 = get_fuel_state(id2)
    
    log = []
    log.append(f"[NEGOTIATE] Evaluating {name1} ({tier1}: {score1}) vs {name2} ({tier2}: {score2})")
    
    yielding_sat = None
    maintaining_sat = None
    
    if score1 < score2:
        log.append(f"[DECISION] {name1} has lower priority and must yield.")
        yielding_sat, maintaining_sat = sat1, sat2
    elif score2 < score1:
        log.append(f"[DECISION] {name2} has lower priority and must yield.")
        yielding_sat, maintaining_sat = sat2, sat1
    else:
        # Equal priority, fuel tie-breaker
        log.append(f"[NEGOTIATE] Priority tied. Evaluating Fuel: {name1} ({fuel1}%) vs {name2} ({fuel2}%)")
        if fuel1 >= fuel2:
            log.append(f"[DECISION] {name1} has higher fuel reserves and must yield.")
            yielding_sat, maintaining_sat = sat1, sat2
        else:
            log.append(f"[DECISION] {name2} has higher fuel reserves and must yield.")
            yielding_sat, maintaining_sat = sat2, sat1
            
    return yielding_sat, maintaining_sat, log


def autocalculate_maneuver(yielding_sat: dict, maintaining_sat: dict) -> tuple[float, list]:
    """
    Calculates the smallest necessary maneuver for the yielding satellite.
    Returns (delta_h, additional_logs)
    """
    log = []
    
    name_yield = yielding_sat.get("OBJECT_NAME", "UNKNOWN")
    name_maint = maintaining_sat.get("OBJECT_NAME", "UNKNOWN")
    
    log.append(f"[SIMULATE] Calculating minimal safe Delta-H for {name_yield}...")
    
    step_sequence = [0.5, -0.5, 1.0, -1.0, 2.0, -2.0, 3.0, -3.0, 5.0, -5.0, 10.0, -10.0]
    optimal_step = None
    
    for step in step_sequence:
        sat_maneuvered = simulate_altitude_change(yielding_sat, step)
        
        events = predict_closest_approaches([sat_maneuvered, maintaining_sat], hours_ahead=24, step_seconds=60, threshold_km=MONITORING_THRESHOLD_KM)
        
        if not events:
            optimal_step = step
            break
            
        closest_event = min(events, key=lambda e: e.min_distance_km)
        if closest_event.risk_score < 30: # 'LOW' risk
            optimal_step = step
            break
            
    if optimal_step is not None:
        log.append(f"[ACTION] {name_yield} assigned a {optimal_step:+} km altitude maneuver. {name_maint} maintains status quo.")
        return optimal_step, log
    else:
        log.append(f"[CRITICAL] {name_yield} unable to safely resolve within nominal fuel thresholds. Human operator required.")
        return 0.0, log
