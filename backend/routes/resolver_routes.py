"""
Resolver Routes — Endpoints for the Autonomous Collision Resolver.
"""

from flask import Blueprint, jsonify, request
from datetime import datetime, timezone
import uuid

from services.tle_service import fetch_tle_data
from services.collision_service import detect_current_collisions
from services.resolver_service import determine_maneuver_target, autocalculate_maneuver, get_priority_score, get_fuel_state
from config import MONITORING_THRESHOLD_KM

resolver_bp = Blueprint("resolver", __name__)

@resolver_bp.route("/api/resolver/auto-resolve", methods=["GET"])
def auto_resolve():
    """
    Fetch all current conjunctions and autonomously resolve them.
    Returns the resolution strategy and negotiation logs.
    """
    group = request.args.get("group", "stations")
    threshold = float(request.args.get("threshold", 500))
    
    raw_data = fetch_tle_data(group)
    target_time = datetime.now(timezone.utc)
    events = detect_current_collisions(raw_data, target_time, threshold)
    
    resolutions = []
    
    # ── System boot log (always included so the feed is never empty) ──
    boot_logs = [
        f"[NEGOTIATE] Autonomous Resolver v2.0 initializing...",
        f"[NEGOTIATE] Scanning {len(raw_data)} satellites in '{group}' constellation",
        f"[NEGOTIATE] Monitoring threshold: {threshold:.0f} km",
        f"[NEGOTIATE] Detected {len(events)} conjunction event{'s' if len(events) != 1 else ''} in current epoch",
    ]
    
    resolved_count = 0
    
    for event in events:
        sat1 = next((s for s in raw_data if int(s.get("NORAD_CAT_ID", 0)) == event.sat1_norad_id), None)
        sat2 = next((s for s in raw_data if int(s.get("NORAD_CAT_ID", 0)) == event.sat2_norad_id), None)
        
        if not sat1 or not sat2:
            continue
        
        # Build negotiation logs for ALL events (not just high-risk)
        score1, tier1 = get_priority_score(event.sat1_name)
        score2, tier2 = get_priority_score(event.sat2_name)
        fuel1 = get_fuel_state(event.sat1_norad_id)
        fuel2 = get_fuel_state(event.sat2_norad_id)
        
        event_logs = [
            f"[NEGOTIATE] ─── Conjunction Event #{len(resolutions)+1} ───",
            f"[NEGOTIATE] Pair: {event.sat1_name} ↔ {event.sat2_name}",
            f"[NEGOTIATE] Min distance: {event.min_distance_km:.2f} km | Rel velocity: {event.relative_velocity_km_s:.2f} km/s",
            f"[NEGOTIATE] Risk assessment: {event.risk_level} (score: {event.risk_score}/100)",
            f"[NEGOTIATE] {event.sat1_name} — Priority: {tier1} ({score1}) | Fuel: {fuel1}%",
            f"[NEGOTIATE] {event.sat2_name} — Priority: {tier2} ({score2}) | Fuel: {fuel2}%",
        ]
        
        # For medium/high risk — perform full maneuver negotiation
        if event.risk_score >= 40:
            yielding_sat, maintaining_sat, neg_logs = determine_maneuver_target(sat1, sat2)
            delta_h, calc_logs = autocalculate_maneuver(yielding_sat, maintaining_sat)
            event_logs.extend(neg_logs)
            event_logs.extend(calc_logs)
            
            y_name = yielding_sat.get("OBJECT_NAME", "UNKNOWN")
            m_name = maintaining_sat.get("OBJECT_NAME", "UNKNOWN")
            score_y, tier_y = get_priority_score(y_name)
            score_m, tier_m = get_priority_score(m_name)
            resolved_count += 1
            
            resolutions.append({
                "id": str(uuid.uuid4()),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event_summary": f"{event.sat1_name} vs {event.sat2_name}",
                "risk_score": event.risk_score,
                "yielding_sat": {
                    "name": y_name,
                    "norad_id": yielding_sat.get("NORAD_CAT_ID", 0),
                    "tier": tier_y,
                    "delta_h_km": delta_h
                },
                "maintaining_sat": {
                    "name": m_name,
                    "norad_id": maintaining_sat.get("NORAD_CAT_ID", 0),
                    "tier": tier_m
                },
                "logs": event_logs
            })
        else:
            # Low risk — just log the assessment, no maneuver needed
            event_logs.append(f"[DECISION] Risk below maneuver threshold. Monitoring only.")
            event_logs.append(f"[ACTION] {event.sat1_name} ↔ {event.sat2_name}: CLEARED — no maneuver required.")
            
            resolutions.append({
                "id": str(uuid.uuid4()),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event_summary": f"{event.sat1_name} vs {event.sat2_name}",
                "risk_score": event.risk_score,
                "yielding_sat": None,
                "maintaining_sat": None,
                "logs": event_logs
            })
    
    # ── Summary log ──
    summary_logs = []
    if len(events) == 0:
        summary_logs = [
            f"[NEGOTIATE] Full orbital scan complete.",
            f"[ACTION] No conjunction events detected within {threshold:.0f} km threshold.",
            f"[ACTION] All {len(raw_data)} satellites in safe orbital corridors.",
            f"[ACTION] ✓ Space traffic status: ALL CLEAR",
        ]
    else:
        summary_logs = [
            f"[NEGOTIATE] Resolution cycle complete.",
            f"[ACTION] Processed {len(events)} conjunction events.",
            f"[ACTION] Active maneuvers issued: {resolved_count}",
            f"[ACTION] Monitoring-only events: {len(events) - resolved_count}",
            f"[ACTION] ✓ Autonomous resolver cycle finished.",
        ]
    
    # Insert boot logs as a "system" resolution at the start
    resolutions.insert(0, {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_summary": "System Initialization",
        "risk_score": 0,
        "yielding_sat": None,
        "maintaining_sat": None,
        "logs": boot_logs
    })
    
    # Append summary as final resolution
    resolutions.append({
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_summary": "Resolution Summary",
        "risk_score": 0,
        "yielding_sat": None,
        "maintaining_sat": None,
        "logs": summary_logs
    })
        
    return jsonify({
        "status": "success",
        "processed_events": len(events),
        "resolutions": resolutions
    })
