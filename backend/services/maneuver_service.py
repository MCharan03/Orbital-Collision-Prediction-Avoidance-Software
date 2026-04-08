"""
Maneuver Simulation Service
Generates, simulates, and ranks optimal avoidance maneuvers.
"""

import math
import copy
from datetime import datetime, timezone, timedelta
from services.orbit_service import create_satrec_from_omm, propagate_from_satrec
import json
import os

try:
    from groq import Groq
except ImportError:
    Groq = None

# Reference orbital velocity for LEO (~400km)
V_ORBIT_MS = 7660.0

def _simulate_perturbed_trajectory(omm_data, delta_v_ms, direction, tca, window_minutes, secondary_satrec):
    """
    Creates a perturbed SGP4 Satrec by adjusting the Mean Motion (n)
    simulating an impulsive burn at 'window_minutes' before TCA.
    """
    if not omm_data:
        return None, 0

    perturbed_omm = copy.deepcopy(omm_data)
    
    # Current mean motion in rev/day
    current_n = float(perturbed_omm.get("MEAN_MOTION", 15.5))
    
    # Perturb Mean Motion based on Vis-Viva impulsive burn
    # delta_n = -3 * n * (delta_V / V_orbit)
    # Prograde burn (v increases) -> orbit gets larger -> mean motion decreases
    sign = 1.0 if direction == "prograde" else -1.0
    delta_n = -3.0 * current_n * (sign * delta_v_ms / V_ORBIT_MS)
    
    new_n = current_n + delta_n
    perturbed_omm["MEAN_MOTION"] = new_n
    
    # Initialize new SGP4 object
    perturbed_satrec = create_satrec_from_omm(perturbed_omm)
    if not perturbed_satrec:
        return None, 0

    # Simulate relative distance around TCA
    # Sample from TCA - 5 mins to TCA + 5 mins
    start_time = tca - timedelta(minutes=5)
    step = timedelta(seconds=10)
    
    min_dist = float('inf')
    current = start_time
    end_time = tca + timedelta(minutes=5)
    
    trajectory = []
    
    while current <= end_time:
        pos1 = propagate_from_satrec(perturbed_satrec, current)
        pos2 = propagate_from_satrec(secondary_satrec, current)
        
        if pos1 and pos2:
            dx = pos1["x"] - pos2["x"]
            dy = pos1["y"] - pos2["y"]
            dz = pos1["z"] - pos2["z"]
            dist = math.sqrt(dx*dx + dy*dy + dz*dz)
            if dist < min_dist:
                min_dist = dist
                
            trajectory.append({
                "time": current.isoformat(),
                "x": pos1["x"],
                "y": pos1["y"],
                "z": pos1["z"]
            })
            
        current += step

    return trajectory, min_dist

def generate_maneuver_options(sat_omm, secondary_omm, tca_str, original_min_distance):
    """
    Sweep through multiple windows and delta-v magnitudes to find optimal maneuvers.
    """
    try:
        tca = datetime.fromisoformat(tca_str.replace("Z", "+00:00"))
        if tca.tzinfo is None:
            tca = tca.replace(tzinfo=timezone.utc)
    except:
        return []

    secondary_satrec = create_satrec_from_omm(secondary_omm)
    if not secondary_satrec:
        return []

    windows = [10, 20, 45, 90] # Minutes before TCA
    magnitudes = [0.2, 0.5, 1.2, 2.5] # m/s
    directions = ["prograde", "retrograde"]
    
    options = []
    
    for w in windows:
        for m in magnitudes:
            for d in directions:
                traj, new_min_dist = _simulate_perturbed_trajectory(
                    sat_omm, m, d, tca, w, secondary_satrec
                )
                
                if not traj:
                    continue
                
                risk_reduction = 0
                if original_min_distance >= 0:
                    dist_gain = new_min_dist - original_min_distance
                    if dist_gain > 0:
                        risk_reduction = min(99.0, (dist_gain / max(0.1, original_min_distance)) * 100.0)
                
                # 1. Safety Score (Targeting ~5km separation as 100% safe)
                safety_score = min(100.0, (new_min_dist / 5.0) * 100.0)
                
                # 2. Fuel Efficiency (Lower delta-v is better, max is 2.5 m/s)
                fuel_efficiency_score = max(0.0, 100.0 - (m / 2.5) * 100.0)
                
                # 3. Timing Flexibility (Earlier burns are safer/better for operators, max window is 90 mins)
                timing_score = (w / 90.0) * 100.0
                
                # Overall rank score: 50% Safety, 35% Fuel, 15% Timing Flexibility
                rank_score = (safety_score * 0.50) + (fuel_efficiency_score * 0.35) + (timing_score * 0.15)
                
                options.append({
                    "window_minutes_before_tca": w,
                    "burn_direction": d,
                    "delta_v_m_s": m,
                    "fuel_cost": m,
                    "risk_reduction": round(risk_reduction, 1),
                    "new_min_distance_km": round(new_min_dist, 2),
                    "safety_score": round(safety_score, 1),
                    "efficiency_score": round(fuel_efficiency_score, 1),
                    "timing_score": round(timing_score, 1),
                    "score": round(rank_score, 1),
                    "trajectory": traj
                })

    # Sort by overall score descending
    options.sort(key=lambda x: x["score"], reverse=True)
    
    top_options = options[:5]
    
    # Generate explanations
    groq_api_key = os.environ.get("GROQ_API_KEY", "").strip()
    client = Groq(api_key=groq_api_key) if (Groq and groq_api_key) else None
    
    for i, opt in enumerate(top_options):
        opt["rank"] = i + 1
        
        dir_char = '+' if opt["burn_direction"] == "prograde" else '-'
        if client:
            prompt = f"A {opt['burn_direction']} orbital burn of {opt['delta_v_m_s']} m/s executed {opt['window_minutes_before_tca']} minutes before closest approach. Risk dropped by {opt['risk_reduction']}%. Provide a 1-sentence simple, easy-to-understand explanation for a non-expert operator of how this maneuver safely avoids the collision."
            try:
                res = client.chat.completions.create(
                    model="llama3-8b-8192",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=60,
                    temperature=0.5
                )
                opt["recommendation"] = res.choices[0].message.content.strip().replace('"', '')
            except:
                opt["recommendation"] = _fallback_explanation(opt)
        else:
            opt["recommendation"] = _fallback_explanation(opt)

    return top_options

def _fallback_explanation(opt):
    verb = "Speeding up" if opt["burn_direction"] == "prograde" else "Slowing down"
    return f"{verb} by {opt['delta_v_m_s']} m/s alters our arrival time, allowing us to safely miss the threat by a comfortable {opt['new_min_distance_km']} km."
