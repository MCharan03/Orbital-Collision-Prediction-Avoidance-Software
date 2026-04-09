"""
Cascade Simulation Service
Simulates a Kessler Syndrome fragmentation event using Groq LLM or a smart fallback.
"""

from datetime import datetime, timezone
import json
import os
import random

try:
    from groq import Groq
except ImportError:
    Groq = None

def generate_cascade_simulation(sat1_obj, sat2_obj, tca_str, rel_vel, min_dist, nearby_sats):
    """
    Sends the strict prompt to Groq to generate a Kessler Syndrome cascade simulation JSON.
    Falls back to a dynamic mock generator if no key is present.
    """
    try:
         tca = datetime.fromisoformat(tca_str.replace("Z", "+00:00"))
         now = datetime.now(timezone.utc)
         tca_minutes = max(1.0, (tca - now).total_seconds() / 60.0)
    except:
         tca_minutes = 45.0
         
    sat1_name = sat1_obj.get("OBJECT_NAME", str(sat1_obj.get("NORAD_CAT_ID", "UNKNOWN")))
    sat2_name = sat2_obj.get("OBJECT_NAME", str(sat2_obj.get("NORAD_CAT_ID", "UNKNOWN")))
    
    # Calculate average altitude roughly if not provided
    # Standard LEO is ~400-800km. Let's pull from BSTAR or a fallback
    alt1 = 500  # Default fallback
    alt2 = 500
    
    # In a full physics engine, you'd calculate orbit altitude at TCA. We provide 500km as baseline.
    average_altitude = 550.0
    
    # Nearby satellites
    if not nearby_sats:
        nearby_sats = ["STARLINK-1023", "COSMOS 2251 DEB", "NOAA 19", "ONEWEB-0234"]
    else:
        nearby_sats = [s.get("name", str(s.get("norad_id"))) for s in nearby_sats[:6]]
        
    nearby_str = ", ".join(nearby_sats)

    prompt = f"""You are an advanced orbital traffic control AI responsible for preventing cascading satellite collisions (Kessler Syndrome).

A collision event is about to occur. Your task is to simulate the resulting debris field and recommend mitigation strategies.

----------------------------------------

Collision Event:
- Satellite 1: {sat1_name}
- Satellite 2: {sat2_name}
- Relative Velocity: {rel_vel} km/s
- Time to Collision: {tca_minutes:.1f} minutes
- Altitude: {average_altitude} km

Nearby Active Satellites:
{nearby_str}

----------------------------------------

Simulation Requirements:

1. Assume fragmentation into 50–200 debris objects
2. Debris spreads in multiple directions (spherical/cone distribution)
3. Debris velocity depends on collision energy
4. Evaluate debris trajectories over next 2 hours

----------------------------------------

Tasks:

1. Estimate debris count
2. Identify satellites at risk of secondary collision
3. Assign risk level to each affected satellite
4. Estimate time to impact (minutes)
5. Recommend avoidance maneuvers for each satellite
6. Compute overall cascade risk score (0–100)

----------------------------------------

Return ONLY valid JSON in this exact structure:

{{
  "debris_count": number,
  "cascade_risk_score": number,
  "risk_level": "LOW | MEDIUM | HIGH | CRITICAL",
  "affected_satellites": [
    {{
      "name": "satellite_name",
      "risk_level": "LOW | MEDIUM | HIGH",
      "time_to_impact_minutes": number,
      "recommended_maneuver": {{
        "direction": "prograde | retrograde | radial-in | radial-out | normal",
        "delta_v_m_s": number
      }}
    }}
  ],
  "summary": "technical explanation",
  "operator_explanation": "simple explanation for non-experts",
  "recommended_global_action": "overall mitigation strategy"
}}
"""

    groq_api_key = os.environ.get("GROQ_API_KEY", "").strip()
    client = Groq(api_key=groq_api_key) if (Groq and groq_api_key) else None

    if client:
        try:
            res = client.chat.completions.create(
                model="llama3-70b-8192",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=600,
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            data = json.loads(res.choices[0].message.content)
            return data
        except Exception as e:
            print(f"[CASCADE] Error calling Groq: {e}")
            pass # Fall back to mock

    # --- FALLBACK SIMULATOR --- #
    debris_count = random.randint(110, 195)
    score = random.randint(75, 96)
    
    targets = []
    directions = ["prograde", "retrograde", "radial-out", "normal"]
    
    for i, s_name in enumerate(nearby_sats[:3]):
         targets.append({
             "name": s_name,
             "risk_level": "HIGH" if i == 0 else "MEDIUM",
             "time_to_impact_minutes": random.randint(15, 110),
             "recommended_maneuver": {
                 "direction": random.choice(directions),
                 "delta_v_m_s": round(random.uniform(0.5, 2.5), 1)
             }
         })

    return {
      "debris_count": debris_count,
      "cascade_risk_score": score,
      "risk_level": "CRITICAL" if score > 85 else "HIGH",
      "affected_satellites": targets,
      "summary": f"Fragmentation of {sat1_name} and {sat2_name} at {rel_vel} km/s yields an expanding spherical debris cloud. Within 120 minutes, secondary intersection probabilities exceed safe thresholds.",
      "operator_explanation": f"If these satellites collide, they will shatter into nearly {debris_count} dangerous pieces. This debris will act like a shotgun blast in orbit, threatening other active satellites within the hour.",
      "recommended_global_action": "Alert operators to immediately prepare prograde defense burns for HIGH-risk targets, and temporarily halt any planned orbit raising in this altitude band."
    }
