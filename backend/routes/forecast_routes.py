"""
Forecast Routes — 24-Hour Predictive Forecasting endpoint.
"""

from flask import Blueprint, jsonify, request
from services.tle_service import fetch_tle_data
from services.forecast_service import generate_24h_forecast
from config import MONITORING_THRESHOLD_KM

forecast_bp = Blueprint("forecast", __name__)


@forecast_bp.route("/api/forecast", methods=["GET"])
def get_forecast():
    """
    Generate a 24-hour predictive forecast for proactive space traffic management.

    Query params:
      - group: CelesTrak group (default: 'stations')
      - step: Propagation step in seconds (default: 120)
      - threshold: Distance threshold in km (default: MONITORING_THRESHOLD_KM)

    Returns:
      JSON with hourly_buckets (24 entries), trend, peak_hour, and summary.
    """
    group = request.args.get("group", "stations")
    step = int(request.args.get("step", 120))
    threshold = float(request.args.get("threshold", MONITORING_THRESHOLD_KM))

    # Clamp step to sensible range (30s–600s)
    step = max(30, min(600, step))

    raw_data = fetch_tle_data(group)

    if not raw_data:
        return jsonify({
            "status": "error",
            "message": f"No satellite data available for group '{group}'",
        }), 404

    forecast = generate_24h_forecast(raw_data, step, threshold)

    return jsonify({
        "status": "success",
        "group": group,
        "step_seconds": step,
        "threshold_km": threshold,
        **forecast,
    })
