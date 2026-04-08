import math
from copy import deepcopy

MU = 398600.4418  # Earth's gravitational constant (km^3/s^2)
EARTH_RADIUS = 6378.137  # km

def simulate_altitude_change(omm_data: dict, delta_h_km: float) -> dict:
    """
    Simulate an altitude maneuver by adjusting the mean motion of a satellite in OMM data.
    
    Args:
        omm_data: Dictionary of orbital elements (from CelesTrak JSON)
        delta_h_km: Change in altitude in km (positive = raise orbit, negative = lower orbit)
        
    Returns:
        A new omm_data dictionary with updated MEAN_MOTION.
    """
    new_data = deepcopy(omm_data)
    
    try:
        # Get mean motion in revs per day
        n_rev_per_day = float(new_data.get("MEAN_MOTION", 0.0))
        if n_rev_per_day <= 0:
            return new_data
            
        # Convert revs/day to rad/sec
        n_rad_sec = n_rev_per_day * 2.0 * math.pi / 86400.0
        
        # Current semi-major axis (km)
        a_current = math.pow(MU / (n_rad_sec * n_rad_sec), 1.0/3.0)
        
        # New semi-major axis (km)
        a_new = a_current + delta_h_km
        
        # Cannot crash into center of Earth
        if a_new < EARTH_RADIUS:
            a_new = EARTH_RADIUS + 100.0 # set to minimal sensible altitude
            
        # New mean motion in rad/sec
        n_new_rad_sec = math.sqrt(MU / (a_new * a_new * a_new))
        
        # New mean motion in rev/day
        n_new_rev_per_day = n_new_rad_sec * 86400.0 / (2.0 * math.pi)
        
        new_data["MEAN_MOTION"] = n_new_rev_per_day
        
        # We also need to strip out TLE_LINE1 and TLE_LINE2 so the SGP4 service 
        # is forced to use the newly computed OMM elements instead of the old TLEs.
        new_data.pop("TLE_LINE1", None)
        new_data.pop("TLE_LINE2", None)
        
    except ValueError as e:
        print(f"[MANEUVER] Error simulating maneuver: {e}")
        
    return new_data
