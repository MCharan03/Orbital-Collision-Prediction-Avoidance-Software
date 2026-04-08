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
