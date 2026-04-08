"""
Maneuver Routes — Endpoints for Auto-Avoidance optimizations.
"""

from flask import Blueprint, jsonify, request
from services.tle_service import fetch_tle_data
from services.maneuver_service import generate_maneuver_options

maneuver_bp = Blueprint("maneuvers", __name__)

@maneuver_bp.route("/api/maneuvers/recommend", methods=["POST"])
def recommend_maneuvers():
    """
    Generate and rank simulated orbital maneuvers to avoid a collision.
    Expects JSON:
    {
      "sat1_id": 25544,
      "sat2_id": 49044,
      "tca": "2026-04-08T18:30:00Z",
      "original_min_distance": 0.5
    }
    """
    data = request.json or {}
    
    sat1_id = data.get("sat1_id")
    sat2_id = data.get("sat2_id")
    tca_str = data.get("tca")
    orig_dist = float(data.get("original_min_distance", 0.0))
    
    if not all([sat1_id, sat2_id, tca_str]):
        return jsonify({"error": "Missing required parameters"}), 400
        
    # We load all stations to find the OMM elements. In a prod app, we'd query a DB.
    # We default to 'stations' and 'active' as a broad net for the demo
    catalog = fetch_tle_data("stations") + fetch_tle_data("active")
    
    sat1_omm = next((s for s in catalog if str(s.get("NORAD_CAT_ID")) == str(sat1_id)), None)
    sat2_omm = next((s for s in catalog if str(s.get("NORAD_CAT_ID")) == str(sat2_id)), None)
    
    if not sat1_omm or not sat2_omm:
        return jsonify({"error": "Satellite OMM data not found in cache"}), 404
        
    options = generate_maneuver_options(sat1_omm, sat2_omm, tca_str, orig_dist)
    
    return jsonify({
        "status": "success",
        "target_sat_id": sat1_id,
        "recommendations": options
    })
