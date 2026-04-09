"""
ASWAN API Routes — Autonomous Space Weather Adaptive Network

Endpoints:
  GET /api/aswan/weather         — Space weather events + risk zones
  GET /api/aswan/network         — Network status + rerouting recommendations
  GET /api/aswan/sustainability  — Debris risk + congestion analysis
  GET /api/aswan/status          — ASWAN system status summary
"""

from flask import Blueprint, jsonify, request
from datetime import datetime, timezone

from services.tle_service import fetch_tle_data
from services.orbit_service import propagate_all
from services.space_weather_service import get_space_weather
from services.network_service import (
    generate_recommendations,
    compute_network_status,
)
from services.sustainability_service import analyze_congestion

aswan_bp = Blueprint("aswan", __name__)


def _get_positions(group: str, time_str: str = None):
    """Helper to fetch and propagate satellite positions."""
    if time_str:
        try:
            target_time = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
        except ValueError:
            target_time = datetime.now(timezone.utc)
    else:
        target_time = datetime.now(timezone.utc)

    raw_data = fetch_tle_data(group)
    positions = propagate_all(raw_data, target_time)
    position_dicts = [p.to_dict() for p in positions]
    return position_dicts, target_time


@aswan_bp.route("/api/aswan/weather", methods=["GET"])
def get_weather():
    """
    Space weather intelligence — active events, risk zones, affected satellites.
    
    Query params:
      - group: satellite group (default: 'stations')
      - time: target time ISO (default: now)
    """
    group = request.args.get("group", "stations")
    time_str = request.args.get("time", None)

    position_dicts, target_time = _get_positions(group, time_str)
    weather = get_space_weather(target_time, position_dicts)

    return jsonify({
        "status": "success",
        **weather,
    })


@aswan_bp.route("/api/aswan/network", methods=["GET"])
def get_network():
    """
    Network status and rerouting recommendations.
    
    Query params:
      - group: satellite group (default: 'stations')
      - time: target time ISO (default: now)
    """
    group = request.args.get("group", "stations")
    time_str = request.args.get("time", None)

    position_dicts, target_time = _get_positions(group, time_str)
    weather = get_space_weather(target_time, position_dicts)

    affected = weather.get("affected_satellites", [])
    risk_zones = weather.get("risk_zones", [])

    recommendations = generate_recommendations(affected, position_dicts, risk_zones)
    network = compute_network_status(position_dicts, affected, recommendations, risk_zones)

    return jsonify({
        "status": "success",
        "time": target_time.isoformat(),
        **network,
    })


@aswan_bp.route("/api/aswan/sustainability", methods=["GET"])
def get_sustainability():
    """
    Space sustainability analysis — debris, congestion, safe orbits.
    
    Query params:
      - group: satellite group (default: 'stations')
      - years: projection years (default: 10)
    """
    group = request.args.get("group", "stations")
    years = int(request.args.get("years", 10))

    raw_data = fetch_tle_data(group)
    target_time = datetime.now(timezone.utc)
    positions = propagate_all(raw_data, target_time)
    position_dicts = [p.to_dict() for p in positions]

    sustainability = analyze_congestion(position_dicts, years)

    return jsonify({
        "status": "success",
        "time": target_time.isoformat(),
        **sustainability,
    })


@aswan_bp.route("/api/aswan/status", methods=["GET"])
def get_aswan_status():
    """
    ASWAN system status summary — quick health check.
    
    Query params:
      - group: satellite group (default: 'stations')
    """
    group = request.args.get("group", "stations")

    position_dicts, target_time = _get_positions(group)
    weather = get_space_weather(target_time, position_dicts)

    affected = weather.get("affected_satellites", [])
    risk_zones = weather.get("risk_zones", [])
    recommendations = generate_recommendations(affected, position_dicts, risk_zones)
    network = compute_network_status(position_dicts, affected, recommendations, risk_zones)

    return jsonify({
        "status": "success",
        "aswan_version": "1.0.0",
        "time": target_time.isoformat(),
        "weather_threat": weather.get("overall_threat_level", "NOMINAL"),
        "active_events": weather.get("active_event_count", 0),
        "affected_satellites": weather.get("affected_count", 0),
        "network_status": network.get("network_status", "NOMINAL"),
        "risk_before": network.get("risk_before", 0),
        "risk_after": network.get("risk_after", 0),
        "recommendations": network.get("recommendation_count", 0),
    })
