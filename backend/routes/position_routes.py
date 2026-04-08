"""
Position Routes — Satellite position calculation endpoints.
"""

from flask import Blueprint, jsonify, request
from datetime import datetime, timezone, timedelta
from services.tle_service import fetch_tle_data
from services.orbit_service import propagate_all, propagate_satellite, get_orbit_trail

position_bp = Blueprint("positions", __name__)


@position_bp.route("/api/positions", methods=["GET"])
def get_positions():
    """
    Get current positions of all loaded satellites.
    Query params:
      - group: CelesTrak group (default: 'stations')
      - time: ISO timestamp for position calculation (default: now)
    """
    group = request.args.get("group", "stations")
    time_str = request.args.get("time", None)

    if time_str:
        try:
            target_time = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
        except ValueError:
            return jsonify({"status": "error", "message": "Invalid time format. Use ISO 8601."}), 400
    else:
        target_time = datetime.now(timezone.utc)

    raw_data = fetch_tle_data(group)
    positions = propagate_all(raw_data, target_time)

    return jsonify({
        "status": "success",
        "time": target_time.isoformat(),
        "count": len(positions),
        "positions": [p.to_dict() for p in positions],
    })


@position_bp.route("/api/positions/<int:norad_id>/trail", methods=["GET"])
def get_trail(norad_id: int):
    """
    Get orbit trail for a specific satellite.
    Query params:
      - group: CelesTrak group (default: 'stations')
      - duration: Trail duration in minutes (default: 90)
      - time: Center time for trail (default: now)
    """
    group = request.args.get("group", "stations")
    duration = int(request.args.get("duration", 90))
    time_str = request.args.get("time", None)

    if time_str:
        try:
            center_time = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
        except ValueError:
            return jsonify({"status": "error", "message": "Invalid time format."}), 400
    else:
        center_time = datetime.now(timezone.utc)

    # Find the satellite TLE
    raw_data = fetch_tle_data(group)
    sat = None
    for s in raw_data:
        if int(s.get("NORAD_CAT_ID", 0)) == norad_id:
            sat = s
            break

    if not sat:
        return jsonify({"status": "error", "message": f"Satellite {norad_id} not found in group '{group}'"}), 404

    trail = get_orbit_trail(
        sat.get("TLE_LINE1", ""), sat.get("TLE_LINE2", ""),
        center_time=center_time,
        duration_minutes=duration,
        omm_data=sat,
    )

    return jsonify({
        "status": "success",
        "norad_id": norad_id,
        "name": sat.get("OBJECT_NAME", "UNKNOWN"),
        "trail_points": len(trail),
        "trail": trail,
    })


@position_bp.route("/api/positions/timeseries", methods=["GET"])
def get_timeseries():
    """
    Get positions of all satellites over a time range (for time slider).
    Query params:
      - group: CelesTrak group (default: 'stations')
      - start: Start time ISO (default: now)
      - hours: Duration in hours (default: 2)
      - step: Step in seconds (default: 300 = 5 min)
    """
    group = request.args.get("group", "stations")
    start_str = request.args.get("start", None)
    hours = int(request.args.get("hours", 2))
    step_sec = int(request.args.get("step", 300))

    if start_str:
        try:
            start_time = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
        except ValueError:
            return jsonify({"status": "error", "message": "Invalid time format."}), 400
    else:
        start_time = datetime.now(timezone.utc)

    raw_data = fetch_tle_data(group)
    end_time = start_time + timedelta(hours=hours)
    step = timedelta(seconds=step_sec)

    frames = []
    current = start_time
    while current <= end_time:
        positions = propagate_all(raw_data, current)
        frames.append({
            "time": current.isoformat(),
            "positions": [p.to_dict() for p in positions],
        })
        current += step

    return jsonify({
        "status": "success",
        "frame_count": len(frames),
        "step_seconds": step_sec,
        "frames": frames,
    })
