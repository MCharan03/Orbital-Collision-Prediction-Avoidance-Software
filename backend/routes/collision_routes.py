"""
Collision Routes — Collision detection and prediction endpoints.
"""

from flask import Blueprint, jsonify, request
from datetime import datetime, timezone
from services.tle_service import fetch_tle_data
from services.collision_service import (
    detect_current_collisions,
    predict_closest_approaches,
    get_collision_summary,
)
from services.maneuver_service import simulate_altitude_change
from config import MONITORING_THRESHOLD_KM, PREDICTION_WINDOW_HOURS

collision_bp = Blueprint("collisions", __name__)


@collision_bp.route("/api/collisions", methods=["GET"])
def get_collisions():
    """
    Detect current collision risks.
    Query params:
      - group: CelesTrak group (default: 'stations')
      - threshold: Distance threshold in km (default: 500)
      - time: Target time ISO (default: now)
    """
    group = request.args.get("group", "stations")
    threshold = float(request.args.get("threshold", MONITORING_THRESHOLD_KM))
    time_str = request.args.get("time", None)

    if time_str:
        try:
            target_time = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
        except ValueError:
            return jsonify({"status": "error", "message": "Invalid time format."}), 400
    else:
        target_time = datetime.now(timezone.utc)

    raw_data = fetch_tle_data(group)
    events = detect_current_collisions(raw_data, target_time, threshold)
    summary = get_collision_summary(events)

    return jsonify({
        "status": "success",
        "time": target_time.isoformat(),
        "threshold_km": threshold,
        "summary": summary,
        "events": [e.to_dict() for e in events],
    })


@collision_bp.route("/api/collisions/predict", methods=["GET"])
def predict_collisions():
    """
    Predict closest approaches over a time window.
    WARNING: This is computationally expensive for large groups.

    Query params:
      - group: CelesTrak group (default: 'stations')
      - hours: Prediction window (default: 24)
      - step: Step size in seconds (default: 60)
      - threshold: Distance threshold in km (default: 500)
    """
    group = request.args.get("group", "stations")
    hours = int(request.args.get("hours", min(PREDICTION_WINDOW_HOURS, 24)))
    step = int(request.args.get("step", 60))
    threshold = float(request.args.get("threshold", MONITORING_THRESHOLD_KM))

    raw_data = fetch_tle_data(group)
    events = predict_closest_approaches(raw_data, hours, step, threshold)
    summary = get_collision_summary(events)

    return jsonify({
        "status": "success",
        "prediction_window_hours": hours,
        "step_seconds": step,
        "threshold_km": threshold,
        "summary": summary,
        "events": [e.to_dict() for e in events],
    })

@collision_bp.route("/api/maneuver/simulate", methods=["POST"])
def simulate_maneuver():
    """
    Simulate an orbital maneuver (altitude change) for a specific satellite
    and re-run collision predictions.
    """
    data = request.json
    if not data:
        return jsonify({"status": "error", "message": "No JSON payload provided"}), 400
        
    group = data.get("group", "stations")
    sat_id = int(data.get("sat_norad_id"))
    target_id = int(data.get("target_norad_id"))
    delta_h_km = float(data.get("delta_h_km", 0.0))
    hours = int(data.get("hours", 24))
    
    raw_data = fetch_tle_data(group)
    
    # Isolate our satellites
    sat_orig = next((s for s in raw_data if int(s.get("NORAD_CAT_ID", 0)) == sat_id), None)
    
    if not sat_orig:
        return jsonify({"status": "error", "message": f"Satellite {sat_id} not found"}), 404
        
    # Apply maneuver to target satellite
    sat_maneuvered = simulate_altitude_change(sat_orig, delta_h_km)
    
    # Replace original satellite in the data pool with the maneuvered one
    modified_data = []
    for s in raw_data:
        if int(s.get("NORAD_CAT_ID", 0)) == sat_id:
            modified_data.append(sat_maneuvered)
        else:
            modified_data.append(s)
            
    # Re-run prediction
    events = predict_closest_approaches(modified_data, hours=hours, step_seconds=60, threshold_km=MONITORING_THRESHOLD_KM)
    
    # Filter events to just those involving our satellite and the target
    target_events = [e for e in events if (
        (e.sat1_id == sat_id and e.sat2_id == target_id) or 
        (e.sat1_id == target_id and e.sat2_id == sat_id)
    )]
    
    # Find the minimum distance approach from that list
    if not target_events:
        return jsonify({
            "status": "success",
            "message": "No collision risks found post-maneuver.",
            "new_distance_km": None,
            "new_risk_score": 0,
            "new_risk_level": "LOW",
        })
        
    closest_event = min(target_events, key=lambda e: e.min_distance_km)
    
    return jsonify({
        "status": "success",
        "new_distance_km": closest_event.min_distance_km,
        "new_risk_score": closest_event.risk_score,
        "new_risk_level": closest_event.risk_level,
        "event": closest_event.to_dict()
    })
