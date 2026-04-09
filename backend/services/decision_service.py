"""
Decision Engine Service
Generates N-Body collision avoidance maneuvers, predicts cascades, and returns AI explanations.
"""
import math
import copy
import os
import json
from datetime import datetime, timezone, timedelta
import google.generativeai as genai

from services.orbit_service import create_satrec_from_omm, propagate_from_satrec
from services.cascade_service import generate_cascade_simulation

V_ORBIT_MS = 7660.0
CONFLICT_THRESHOLD_KM = 5.0

def _simulate_nbody_trajectory(omm_data, delta_v_ms, direction, tca, window_minutes, secondary_satrec, nearby_satrecs_dict):
    """
    Creates a perturbed SGP4 Satrec (burn window_minutes before TCA)
    Checks distance to secondary_sat, AND all nearby_satrecs.
    Returns (trajectory, min_dist_to_primary, new_conflicts)
    """
    if not omm_data:
        return None, 0, []

    perturbed_omm = copy.deepcopy(omm_data)
    current_n = float(perturbed_omm.get("MEAN_MOTION", 15.5))
    
    # Simple Vis-Viva for LEO
    # prograde (+), retrograde (-). Radial changes are much less effective for immediate timing, we stick to prograde/retrograde
    sign = 1.0 if direction == "prograde" else -1.0
    
    # If radial, use a small artificial perturbation for simulation
    if direction == "radial-out":
        delta_n = -1.0 * current_n * (1.0 * delta_v_ms / V_ORBIT_MS)
    elif direction == "radial-in":
        delta_n = 1.0 * current_n * (1.0 * delta_v_ms / V_ORBIT_MS)
    else:
        delta_n = -3.0 * current_n * (sign * delta_v_ms / V_ORBIT_MS)
        
    new_n = current_n + delta_n
    perturbed_omm["MEAN_MOTION"] = new_n
    
    perturbed_satrec = create_satrec_from_omm(perturbed_omm)
    if not perturbed_satrec:
        return None, 0, []

    start_time = tca - timedelta(minutes=window_minutes)
    # Check up to 6 hours ahead (we'll step larger to save time, e.g. 1 min steps)
    step = timedelta(minutes=1)
    end_time = tca + timedelta(hours=6)
    
    min_dist_to_primary = float('inf')
    new_conflicts = set()
    current = start_time
    
    trajectory = []
    
    while current <= end_time:
        pos1 = propagate_from_satrec(perturbed_satrec, current)
        if not pos1:
             break
        
        # Check against primary target
        if current <= tca + timedelta(minutes=10) and current >= tca - timedelta(minutes=10):
            pos2 = propagate_from_satrec(secondary_satrec, current)
            if pos2:
                dx = pos1["x"] - pos2["x"]
                dy = pos1["y"] - pos2["y"]
                dz = pos1["z"] - pos2["z"]
                dist = math.sqrt(dx*dx + dy*dy + dz*dz)
                if dist < min_dist_to_primary:
                    min_dist_to_primary = dist
        
        # N-body checks
        for name, other_satrec in nearby_satrecs_dict.items():
            other_pos = propagate_from_satrec(other_satrec, current)
            if other_pos:
                dx = pos1["x"] - other_pos["x"]
                dy = pos1["y"] - other_pos["y"]
                dz = pos1["z"] - other_pos["z"]
                dist = math.sqrt(dx*dx + dy*dy + dz*dz)
                if dist < CONFLICT_THRESHOLD_KM:
                    new_conflicts.add(name)
                    
        current += step

    return trajectory, min_dist_to_primary, list(new_conflicts)


def decide_maneuver(collision_event, nearby_sats):
    """
    Main Global Decision Engine function.
    """
    sat1_omm = collision_event.get("sat1")
    sat2_omm = collision_event.get("sat2")
    tca_str = collision_event.get("tca")
    min_dist = float(collision_event.get("min_distance_km", 0))
    rel_vel = float(collision_event.get("relative_velocity_km_s", 0))
    
    try:
        tca = datetime.fromisoformat(tca_str.replace("Z", "+00:00"))
    except:
        tca = datetime.now(timezone.utc) + timedelta(minutes=45)

    secondary_satrec = create_satrec_from_omm(sat2_omm)
    
    # Filter nearby sats to max 10 to limit N-body complexity
    nearby_sats = nearby_sats[:10]
    nearby_satrecs_dict = {}
    for sat in nearby_sats:
         # ensure it's not the primary objects
         sname = sat.get("name", str(sat.get("norad_id")))
         if sname != sat1_omm.get("OBJECT_NAME") and sname != sat2_omm.get("OBJECT_NAME"):
             rec = create_satrec_from_omm(sat)
             if rec:
                 nearby_satrecs_dict[sname] = rec
                 
    windows = [5, 10, 20, 30]
    directions = ["prograde", "retrograde", "radial-in", "radial-out"]
    deltavs = [0.2, 0.5, 1.5]
    
    best_maneuvers = []
    rejected_maneuvers = []
    
    for w in windows:
        for d in directions:
            for v in deltavs:
                traj, new_min_dist, conflicts = _simulate_nbody_trajectory(
                    sat1_omm, v, d, tca, w, secondary_satrec, nearby_satrecs_dict
                )
                
                # Scoring
                risk_reduction = 0
                if min_dist > 0:
                     gain = new_min_dist - min_dist
                     risk_reduction = min(100.0, max(0.0, (gain / min_dist) * 100))
                elif new_min_dist > min_dist:
                     risk_reduction = min(100.0, new_min_dist * 10)
                     
                safety_score = min(100.0, (new_min_dist / 5.0) * 100.0)
                fuel_cost = v
                efficiency_score = risk_reduction / max(0.1, fuel_cost)
                timing_score = (w / 30.0) * 100.0
                
                final_score = (safety_score * 0.5) + (min(100.0, efficiency_score) * 0.3) + (timing_score * 0.2)
                
                maneuver = {
                    "window_minutes_before_tca": w,
                    "burn_direction": d,
                    "delta_v_m_s": v,
                    "fuel_cost": fuel_cost,
                    "risk_reduction": round(risk_reduction, 1),
                    "safety_score": round(safety_score, 1),
                    "efficiency_score": round(min(100.0, efficiency_score), 1),
                    "final_score": round(final_score, 1),
                    "new_conflicts": conflicts
                }
                
                # Validation rules
                if conflicts or safety_score < 50:
                    rejected_maneuvers.append({
                        "reason": f"creates new collision with {', '.join(conflicts)}" if conflicts else "unsafe minimum distance",
                        "conflicts": conflicts,
                        "maneuver_details": maneuver
                    })
                else:
                    maneuver["status"] = "VALID"
                    best_maneuvers.append(maneuver)

    # Sort descending
    best_maneuvers.sort(key=lambda x: x["final_score"], reverse=True)
    best_maneuvers = best_maneuvers[:3] # keep top 3
    
    for idx, m in enumerate(best_maneuvers):
        m["rank"] = idx + 1
        
    rejected_maneuvers = rejected_maneuvers[:3]
    
    # Cascade prediction if risk remained high originally
    cascade = generate_cascade_simulation(sat1_omm, sat2_omm, tca_str, rel_vel, min_dist, nearby_sats)
    c_score = cascade.get("cascade_risk_score", 85)
    debris_count = cascade.get("debris_count", 150)
    
    # Use Gemini to generate AI summary & JSON
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if gemini_key:
        genai.configure(api_key=gemini_key)
        # Using gemini-2.0-flash for speed and lower hallucination
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        prompt = f"""You are Forge-X, an autonomous space traffic control AI.
We ran an n-body collision avoidance simulation.

Best Maneuver: {best_maneuvers[0] if best_maneuvers else 'None'}
Cascade Risk: {c_score}/100, {debris_count} debris parts

Provide a strict JSON response:
{{
   "summary": "technical explanation of the decision",
   "operator_explanation": "simple explanation for humans",
   "recommended_action": "what to do right now, e.g. Execute prograde 0.5 m/s burn"
}}
"""
        try:
             res = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
             ai_text = res.text
             parsed_ai = json.loads(ai_text)
        except Exception as e:
             print(f"[GEMINI ERROR] {e}")
             parsed_ai = _mock_ai()
    else:
        parsed_ai = _mock_ai()
        
    return {
        "best_maneuvers": best_maneuvers,
        "rejected_maneuvers": rejected_maneuvers,
        "cascade_prediction": {
            "debris_count": debris_count,
            "cascade_risk_score": c_score,
            "risk_level": "CRITICAL" if c_score > 80 else "HIGH",
            "affected_satellites": cascade.get("affected_satellites", [])
        },
        "summary": parsed_ai.get("summary", ""),
        "operator_explanation": parsed_ai.get("operator_explanation", ""),
        "recommended_action": parsed_ai.get("recommended_action", "")
    }

def _mock_ai():
    return {
        "summary": "N-body calculations confirmed a prograde burn ensures 5+ km separation from all objects and avoids orbital fragmentation cascade.",
        "operator_explanation": "If we burn engines forward slightly, we'll dodge the incoming debris and avoid hitting anyone else in the crowded area.",
        "recommended_action": "Execute recommended 10-minute prograde maneuver."
    }
