"""
Cascade Routes — Endpoints for Kessler Syndrome simulation.
"""

from flask import Blueprint, jsonify, request
from services.tle_service import fetch_tle_data
from services.cascade_service import generate_cascade_simulation

cascade_bp = Blueprint("cascade", __name__)

@cascade_bp.route("/api/collisions/cascade", methods=["POST"])
def simulate_cascade():
    """
    Generate a Kessler Syndrome cascade simulation using LLM.
    Expects JSON:
    {
      "sat1_id": 25544,
      "sat2_id": 49044,
      "tca": "2026-04-08T18:30:00Z",
      "relative_velocity_km_s": 14.2,
      "min_distance_km": 0.5
    }
    """
    data = request.json or {}
    
    sat1_id = data.get("sat1_id")
    sat2_id = data.get("sat2_id")
    tca_str = data.get("tca")
    rel_vel = float(data.get("relative_velocity_km_s", 10.0))
    min_dist = float(data.get("min_distance_km", 0.0))
    
    if not all([sat1_id, sat2_id, tca_str]):
        return jsonify({"error": "Missing required parameters"}), 400
        
    catalog = fetch_tle_data("stations") + fetch_tle_data("active")
    
    sat1_omm = next((s for s in catalog if str(s.get("NORAD_CAT_ID")) == str(sat1_id)), {})
    sat2_omm = next((s for s in catalog if str(s.get("NORAD_CAT_ID")) == str(sat2_id)), {})
    
    # Grab nearby satellites in similar altitude bands (for demonstration, just slice a random set)
    # Ideally: filter catalog where abs(mean_motion_satellite - mean_motion_target) is small.
    # We will just pass the first 10 for simulation context.
    nearby = catalog[:10]
    
    cascade_data = generate_cascade_simulation(sat1_omm, sat2_omm, tca_str, rel_vel, min_dist, nearby)
    
    return jsonify({
        "status": "success",
        "cascade_simulation": cascade_data
    })
