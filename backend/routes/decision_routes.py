from flask import Blueprint, request, jsonify
from services.tle_service import fetch_tle_data
from services.global_decision_service import generate_global_decisions
from datetime import datetime

decision_bp = Blueprint("decision", __name__)

@decision_bp.route("/api/decision-engine", methods=["POST"])
def run_decision_engine():
    data = request.json or {}
    collision_event = data.get("collision")
    group = data.get("group", "stations")
    
    if not collision_event:
        return jsonify({"error": "Missing collision context"}), 400

    # Fetch all nearby sats to use for N-Body checks
    # Using cached list of all sats in the active group
    all_sats = fetch_tle_data(group)
    
    sat1_omm = next((s for s in all_sats if str(s.get("NORAD_CAT_ID")) == str(collision_event.get("sat1_norad_id"))), None)
    sat2_omm = next((s for s in all_sats if str(s.get("NORAD_CAT_ID")) == str(collision_event.get("sat2_norad_id"))), None)
    
    if not sat1_omm or not sat2_omm:
         return jsonify({"error": "Primary satellites not found in telemetry"}), 404

    # We do not want to N-Body check against themselves
    nearby_sats = [s for s in all_sats if str(s.get("NORAD_CAT_ID")) not in [str(sat1_omm.get("NORAD_CAT_ID")), str(sat2_omm.get("NORAD_CAT_ID"))]]

    try:
        engine_output = generate_global_decisions(sat1_omm, sat2_omm, collision_event, nearby_sats)
        return jsonify(engine_output)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
