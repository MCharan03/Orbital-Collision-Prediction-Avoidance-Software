"""
Forge-X — Traffic Manager AI Route
Handles natural language queries about satellite telemetry.
Uses Groq (llama3-70b-8192) when GROQ_API_KEY is present,
falls back to an intelligent context-aware simulation mode otherwise.
"""

from flask import Blueprint, request, jsonify
import os
import json
import random
from dotenv import load_dotenv

load_dotenv()

traffic_manager_bp = Blueprint("traffic_manager", __name__)

# Initialize Groq client only if key is present
groq_api_key = os.environ.get("GROQ_API_KEY", "").strip()
client = None

if groq_api_key:
    try:
        from groq import Groq
        client = Groq(api_key=groq_api_key)
        print("[TRAFFIC-AI] Groq client initialized successfully.")
    except Exception as e:
        print(f"[TRAFFIC-AI] Groq init failed: {e}")
else:
    print("[TRAFFIC-AI] No GROQ_API_KEY found — running in Simulation Mode.")


SYSTEM_PROMPT = """You are Forge-X Traffic Manager AI, a futuristic holographic assistant inside a spacecraft control system.
Your purpose is to predict and avoid satellite collisions, analyze risks, and simulate maneuvers based on orbital mechanics.

You will receive the user's query along with current real-time satellite telemetry (positions, active collision risks).
Always respond with strict JSON in the following schema:
{
  "summary": "Brief 1-sentence summary of the action/analysis",
  "risk_level": "LOW",
  "details": "A slightly longer explanation of what you found or simulated (2-3 sentences)",
  "recommended_action": "Actionable advice (e.g., 'Execute prograde burn of 1.2 m/s', 'Maintain current trajectory')",
  "simulation_data": {
    "affected_satellites": [12345, 54321],
    "collision_predicted": true
  }
}
IMPORTANT: risk_level MUST be exactly "LOW", "MEDIUM", or "HIGH".
Do not include markdown or code blocks. Return raw JSON only."""


# ─── Smart simulation fallback — uses real context data ───────────────────────

SIMULATION_LIBRARY = {
    "collision": {
        "summaries": [
            "Conjunction analysis complete: {count} active high-risk proximity events detected in current orbit window.",
            "Collision probability matrix computed — closest approach in {minutes} minutes at {distance} km separation.",
            "24-hour look-ahead sweep detected {count} conjunction events requiring immediate attention.",
        ],
        "risk": "HIGH",
        "details": [
            "SGP4 trajectory propagation shows a high-risk conjunction between {sat1} and {sat2} with minimum range of {distance} km. Relative velocity at closest approach is approximately {velocity} km/s. Conjunction probability exceeds the 1-in-1000 threshold.",
            "Orbital mechanics analysis indicates {sat1} is on a converging trajectory. The miss distance is below the warning threshold of 200 km. Immediate maneuver planning is recommended to increase separation.",
        ],
        "actions": [
            "Execute prograde delta-V burn of +1.4 m/s at next apogee to increase orbital altitude by ~3 km.",
            "Schedule retrograde avoidance burn of 0.8 m/s — optimal window opens in {minutes} minutes.",
            "Issue COLA (Collision Avoidance) maneuver advisory. Increase perigee by 4 km via 12-second engine burn.",
        ],
    },
    "communication": {
        "summaries": [
            "Communication contingency simulation complete — loss-of-signal protocols modeled for {sat1}.",
            "Link budget analysis indicates {sat1} communication window closes in {minutes} minutes.",
            "Autonomous safe-mode assessment: {sat1} is configured for self-sustaining orbital hold.",
        ],
        "risk": "MEDIUM",
        "details": [
            "In the event {sat1} loses uplink, onboard autonomy systems will trigger proximity hold. The satellite maintains attitude using star-tracker inertial reference with gyroscope backup. Expected autonomous station-keeping duration: 72 hours.",
            "Communication blackout analysis: Ground contact occurs every {orbit_period} minutes. During LOS windows the vehicle defaults to pre-programmed emergency ephemeris. Recovery procedures are pre-loaded.",
        ],
        "actions": [
            "Upload emergency maneuver stack and enable autonomous safe-hold mode before next LOS window.",
            "Activate backup S-band transponder and switch to global ground station network relay.",
            "Pre-program contingency burn sequence — arm abort authority to onboard flight computer.",
        ],
    },
    "burn": {
        "summaries": [
            "Optimal burn window calculated: next maneuver slot opens in {minutes} minutes.",
            "Delta-V budget analysis complete — {sat1} has sufficient propellant for 14 more avoidance burns.",
            "Hohmann transfer sequence planned with minimum fuel expenditure targeting collision-free corridor.",
        ],
        "risk": "LOW",
        "details": [
            "Trajectory optimization complete using Gauss variational equations. The safest burn arc is at the next apogee passage, requiring a prograde delta-V of 1.2 m/s. This maneuver raises perigee by 5 km and achieves a miss distance of 800 km from all tracked objects.",
            "Burn window analysis accounts for atmospheric drag perturbations and J2 oblateness. The recommended node is in {minutes} minutes. Post-burn covariance analysis shows a 99.9% collision-free corridor for the next 48 hours.",
        ],
        "actions": [
            "Execute prograde burn of +1.2 m/s at next apogee (T+{minutes}min) — fuel cost: ~0.8 kg propellant.",
            "Initiate 8-second thruster firing at optimal node. Expected delta-V: 1.4 m/s. Collision clearance: 850 km.",
            "Schedule low-thrust arc burn sequence across next 3 orbits for minimum-fuel avoidance trajectory.",
        ],
    },
    "predict": {
        "summaries": [
            "{count} conjunction events predicted in the next 6 hours across {sat_count} tracked objects.",
            "6-hour look-ahead complete: highest risk event at T+{minutes} minutes with separation of {distance} km.",
            "Predictive collision mesh generated — {count} critical conjunction pairs identified in forecast window.",
        ],
        "risk": "HIGH",
        "details": [
            "Propagating {sat_count} object TLEs forward 6 hours at 60-second intervals using SGP4. The highest-risk conjunction involves {sat1} with a closest approach of {distance} km at T+{minutes} minutes. Second-order perturbations increase uncertainty ellipse by 18% at 6-hour epoch.",
            "Monte Carlo uncertainty analysis (1000 samples) confirms the collision probability for the leading conjunction pair is above the operational threshold. The uncertainty growth due to atmospheric drag makes the 4-6 hour window the highest-risk zone.",
        ],
        "actions": [
            "Flag top 3 conjunction pairs for immediate operator review. Initiate COLA planning for highest-risk event.",
            "Generate automated TCA (Time of Closest Approach) notifications for all pairs below 100km miss distance.",
            "Update screening threshold to 500 km for heightened watch period covering next 6-hour forecast window.",
        ],
    },
    "default": {
        "summaries": [
            "Orbital analysis complete — fleet status nominal with {count} active conjunction monitors.",
            "Space traffic assessment processed — {sat_count} objects in current tracking catalog.",
            "Telemetry scan complete: {sat_count} satellites nominal, {count} under enhanced monitoring.",
        ],
        "risk": "LOW",
        "details": [
            "All {sat_count} tracked objects are within nominal orbital parameters. Conjunction screening against the full catalog shows no imminent critical events in the 24-hour planning horizon. Current fleet average altitude: {altitude} km.",
            "Orbital health check complete. The {sat_count} objects in the current group maintain safe separation distances. The most recent orbital decay analysis indicates no re-entry threats within the 7-day forecast window.",
        ],
        "actions": [
            "Maintain current orbital configuration. Continue standard 60-second polling cycle.",
            "No immediate action required. Continue routine station-keeping with next scheduled conjunction screening at T+60 minutes.",
        ],
    },
}

def _classify_intent(query: str) -> str:
    """Map the user query to a simulation category."""
    q = query.lower()
    if any(w in q for w in ["collision", "conjunct", "crash", "impact", "hit"]):
        return "collision"
    if any(w in q for w in ["communicat", "signal", "uplink", "contact", "loss"]):
        return "communication"
    if any(w in q for w in ["burn", "maneuver", "delta-v", "thruster", "fire", "window", "safest"]):
        return "burn"
    if any(w in q for w in ["predict", "next", "hours", "forecast", "upcoming", "6 hour"]):
        return "predict"
    return "default"

def _build_simulation_response(query: str, context: dict) -> dict:
    """Build a rich, context-aware simulated response."""
    intent = _classify_intent(query)
    lib = SIMULATION_LIBRARY[intent]

    sat_count = context.get("active_satellites", 31)
    high_risk = context.get("high_risk_count", 0)
    sample_sats = context.get("sample_sats", [])

    # Pick real satellite names if available
    sat1_name = sample_sats[0]["name"] if sample_sats else "ISS (ZARYA)"
    sat2_name = sample_sats[1]["name"] if len(sample_sats) > 1 else "SOYUZ-MS 28"
    sat1_id   = sample_sats[0]["id"]   if sample_sats else 25544
    sat2_id   = sample_sats[1]["id"]   if len(sample_sats) > 1 else 49044

    # High-risk satellites get priority in simulation
    high_risk_sats = [s for s in sample_sats if s.get("risk") == "HIGH"]
    if high_risk_sats:
        sat1_name = high_risk_sats[0]["name"]
        sat1_id   = high_risk_sats[0]["id"]

    affected_ids = [sat1_id, sat2_id]
    if high_risk_sats:
        affected_ids = [s["id"] for s in high_risk_sats[:4]]

    # Randomised but realistic-looking values
    minutes  = random.randint(8, 47)
    distance = round(random.uniform(18, 95), 1)
    velocity = round(random.uniform(6.5, 14.2), 2)
    altitude = int(sample_sats[0].get("alt", 420)) if sample_sats else 420
    orbit_period = 92  # ISS-ish

    def fmt(s: str) -> str:
        return s.format(
            sat1=sat1_name, sat2=sat2_name,
            count=max(1, high_risk),
            sat_count=sat_count,
            minutes=minutes,
            distance=distance,
            velocity=velocity,
            altitude=altitude,
            orbit_period=orbit_period,
        )

    # Determine final risk level
    risk_level = lib["risk"]
    if intent == "default":
        risk_level = "HIGH" if high_risk > 3 else ("MEDIUM" if high_risk > 0 else "LOW")

    return {
        "summary": fmt(random.choice(lib["summaries"])),
        "risk_level": risk_level,
        "details": fmt(random.choice(lib["details"])),
        "recommended_action": fmt(random.choice(lib["actions"])),
        "simulation_data": {
            "affected_satellites": affected_ids,
            "collision_predicted": risk_level == "HIGH",
        },
    }


# ─── Route ────────────────────────────────────────────────────────────────────

@traffic_manager_bp.route("/api/traffic-manager/query", methods=["POST"])
def query_traffic_manager():
    data = request.json or {}
    user_query   = data.get("query", "").strip()
    context_data = data.get("context", {})

    if not user_query:
        return jsonify({"error": "Query is required"}), 400

    # ── Groq AI path ──
    if client:
        context_str = json.dumps(context_data, separators=(',', ':'))[:2000]
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": f"Context Telemetry: {context_str}\n\nUser Query: {user_query}"},
        ]
        try:
            response = client.chat.completions.create(
                model="llama3-70b-8192",
                messages=messages,
                temperature=0.7,
                max_tokens=600,
                response_format={"type": "json_object"},
            )
            reply = response.choices[0].message.content
            result = json.loads(reply)
            # Ensure risk_level is always valid
            if result.get("risk_level") not in ("LOW", "MEDIUM", "HIGH"):
                result["risk_level"] = "MEDIUM"
            return jsonify(result)
        except Exception as e:
            print(f"[TRAFFIC-AI] Groq error: {e} — falling back to simulation.")
            # Fall through to simulation

    # ── Simulation fallback path ──
    result = _build_simulation_response(user_query, context_data)
    result["_mode"] = "simulation"  # debug hint in response
    return jsonify(result)
