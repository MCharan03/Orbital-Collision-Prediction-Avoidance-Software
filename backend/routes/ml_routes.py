"""
Machine Learning Routes — Serves endpoints for the ML Collision prediction module.
"""

from flask import Blueprint, jsonify, request
from services.tle_service import fetch_tle_data
from services.collision_service import predict_closest_approaches
from services.ml_service import predict_ml_risk
from config import PREDICTION_WINDOW_HOURS

ml_bp = Blueprint("ml", __name__)

@ml_bp.route("/api/ml-risk", methods=["GET"])
def get_ml_risk():
    """
    Get ML-predicted risk scores for satellite collisions.
    Query params:
      - group: 'stations', 'active', etc.
      - hours: hours to predict ahead (default 24)
    """
    group = request.args.get("group", "stations")
    try:
        hours = int(request.args.get("hours", PREDICTION_WINDOW_HOURS))
    except ValueError:
        hours = PREDICTION_WINDOW_HOURS

    satellites = fetch_tle_data(group)
    
    # We use physics engine to find conjunctions
    events = predict_closest_approaches(satellites, hours_ahead=hours)
    
    # ML Engine enhances output
    ml_results = predict_ml_risk(events)
    
    return jsonify({
        "status": "success",
        "group": group,
        "hours_ahead": hours,
        "count": len(ml_results),
        "results": ml_results
    })
