"""
Dashboard Routes — Aggregated data for the main dashboard.
"""

from flask import Blueprint, jsonify, request
from datetime import datetime, timezone
from services.tle_service import fetch_tle_data
from services.orbit_service import propagate_all
from services.collision_service import detect_current_collisions, get_collision_summary
from services.ml_service import predict_ml_risk
from config import MONITORING_THRESHOLD_KM

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/api/dashboard", methods=["GET"])
def get_dashboard():
    """
    Aggregated dashboard data — satellites, positions, collisions, risk summary.
    Single endpoint for the frontend to load all initial data.

    Query params:
      - group: CelesTrak group (default: 'stations')
      - threshold: Collision threshold km (default: 500)
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

    # 1. Fetch satellites
    raw_data = fetch_tle_data(group)

    # 2. Calculate positions
    positions = propagate_all(raw_data, target_time)

    # 3. Detect collisions
    collisions = detect_current_collisions(raw_data, target_time, threshold)
    collision_summary = get_collision_summary(collisions)

    # 4. Build per-satellite risk map
    satellite_risks = {}
    for event in collisions:
        for nid in [event.sat1_norad_id, event.sat2_norad_id]:
            if nid not in satellite_risks or event.risk_score > satellite_risks[nid]["score"]:
                satellite_risks[nid] = {
                    "score": event.risk_score,
                    "level": event.risk_level,
                }

    # 5. Merge positions with risk data
    position_data = []
    for p in positions:
        risk = satellite_risks.get(p.norad_id, {"score": 0, "level": "LOW"})
        pos_dict = p.to_dict()
        pos_dict["risk_score"] = risk["score"]
        pos_dict["risk_level"] = risk["level"]
        position_data.append(pos_dict)

    # 5. Merge ML Risk into the top 20 collisions
    ml_enhanced_collisions = predict_ml_risk(collisions[:20])

    return jsonify({
        "status": "success",
        "time": target_time.isoformat(),
        "group": group,
        "satellite_count": len(raw_data),
        "positions": position_data,
        "collision_summary": collision_summary,
        "collisions": ml_enhanced_collisions,
    })
