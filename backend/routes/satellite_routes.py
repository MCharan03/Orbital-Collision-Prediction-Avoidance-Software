"""
Satellite Routes — TLE data management endpoints.
"""

from flask import Blueprint, jsonify, request
from services.tle_service import (
    fetch_tle_data,
    parse_satellite_info,
    get_available_groups,
)

satellite_bp = Blueprint("satellites", __name__)


@satellite_bp.route("/api/satellites", methods=["GET"])
def get_satellites():
    """
    Get all loaded satellites.
    Query params:
      - group: CelesTrak group name (default: 'stations')
    """
    group = request.args.get("group", "stations")
    raw_data = fetch_tle_data(group)

    satellites = []
    for sat in raw_data:
        info = parse_satellite_info(sat)
        satellites.append(info.to_dict())

    return jsonify({
        "status": "success",
        "group": group,
        "count": len(satellites),
        "satellites": satellites,
    })


@satellite_bp.route("/api/satellites/fetch", methods=["POST"])
def refresh_satellites():
    """
    Force-refresh satellite data from CelesTrak.
    Body: { "group": "stations" }
    """
    body = request.get_json(silent=True) or {}
    group = body.get("group", "stations")

    # Clear cache to force re-fetch
    from utils.cache import clear_cache
    clear_cache(group)

    raw_data = fetch_tle_data(group)
    return jsonify({
        "status": "success",
        "message": f"Fetched {len(raw_data)} satellites for group '{group}'",
        "count": len(raw_data),
        "source": "celestrak",
    })


@satellite_bp.route("/api/satellites/groups", methods=["GET"])
def list_groups():
    """List available CelesTrak satellite groups."""
    return jsonify({
        "status": "success",
        "groups": get_available_groups(),
    })
