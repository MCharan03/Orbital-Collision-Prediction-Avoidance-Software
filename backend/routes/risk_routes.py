"""
Risk Routes — Risk assessment endpoints.
"""

from flask import Blueprint, jsonify, request
from datetime import datetime, timezone
from services.tle_service import fetch_tle_data
from services.orbit_service import propagate_satellite
from services.collision_service import compute_distance_km, compute_relative_velocity
from services.risk_service import compute_risk_assessment
from config import MONITORING_THRESHOLD_KM

risk_bp = Blueprint("risk", __name__)


@risk_bp.route("/api/risk", methods=["GET"])
def get_risk():
    """
    Get risk scores for all satellite pairs within monitoring threshold.
    Query params:
      - group: CelesTrak group (default: 'stations')
      - threshold: Distance threshold km (default: 500)
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

    # Propagate all
    positions = {}
    for sat in raw_data:
        tle1 = sat.get("TLE_LINE1", "")
        tle2 = sat.get("TLE_LINE2", "")
        if not tle1 or not tle2:
            continue
        pos = propagate_satellite(tle1, tle2, target_time)
        if pos:
            nid = int(sat.get("NORAD_CAT_ID", 0))
            positions[nid] = {
                "name": sat.get("OBJECT_NAME", "UNKNOWN"),
                "pos": pos,
            }

    # Pairwise risk assessment
    assessments = []
    sat_ids = list(positions.keys())

    for i in range(len(sat_ids)):
        for j in range(i + 1, len(sat_ids)):
            id1, id2 = sat_ids[i], sat_ids[j]
            p1 = positions[id1]["pos"]
            p2 = positions[id2]["pos"]

            dist = compute_distance_km(p1, p2)
            if dist > threshold:
                continue

            rel_vel = compute_relative_velocity(p1, p2)
            assessment = compute_risk_assessment(
                dist, rel_vel,
                positions[id1]["name"], id1,
                positions[id2]["name"], id2,
            )
            assessments.append(assessment)

    assessments.sort(key=lambda a: a["score"], reverse=True)

    return jsonify({
        "status": "success",
        "time": target_time.isoformat(),
        "count": len(assessments),
        "assessments": assessments,
    })
