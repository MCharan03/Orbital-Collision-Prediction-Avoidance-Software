"""
Orbit Propagation Service — SGP4 + Coordinate Frame Conversion.

Converts satellite orbital data → positions using the SGP4 propagator.
Supports BOTH TLE lines AND OMM (Orbit Mean-Elements Message) JSON format.
Performs TEME → ECEF → Geodetic (lat, lon, alt) conversions.

Reference frames:
  - TEME: True Equator, Mean Equinox (SGP4 native output)
  - ECEF: Earth-Centered, Earth-Fixed (rotates with Earth)
  - Geodetic: Latitude, Longitude, Altitude
"""

import math
import numpy as np
from datetime import datetime, timezone, timedelta
from sgp4.api import Satrec, jday, WGS72
from models.satellite import SatellitePosition
from config import EARTH_RADIUS_KM, ORBIT_TRAIL_MINUTES, ORBIT_TRAIL_STEP_SECONDS


# ─── Coordinate Conversions ─────────────────────────────────────

def _greenwich_sidereal_time(dt: datetime) -> float:
    """
    Calculate Greenwich Mean Sidereal Time (GMST) in radians.
    Uses the IAU 1982 model — accurate enough for SGP4 work.
    """
    jd = (
        367 * dt.year
        - int(7 * (dt.year + int((dt.month + 9) / 12)) / 4)
        + int(275 * dt.month / 9)
        + dt.day
        + 1721013.5
    )
    day_frac = (dt.hour + dt.minute / 60.0 + dt.second / 3600.0) / 24.0
    jd += day_frac

    T = (jd - 2451545.0) / 36525.0

    gmst_deg = (
        280.46061837
        + 360.98564736629 * (jd - 2451545.0)
        + 0.000387933 * T * T
        - T * T * T / 38710000.0
    )
    gmst_deg = gmst_deg % 360.0
    return math.radians(gmst_deg)


def teme_to_ecef(x_teme, y_teme, z_teme, vx_teme, vy_teme, vz_teme, dt):
    """Convert TEME to ECEF by rotating by Greenwich Sidereal Time."""
    gmst = _greenwich_sidereal_time(dt)
    cos_g = math.cos(gmst)
    sin_g = math.sin(gmst)

    x_ecef = cos_g * x_teme + sin_g * y_teme
    y_ecef = -sin_g * x_teme + cos_g * y_teme
    z_ecef = z_teme

    omega_earth = 7.292115e-5
    vx_ecef = cos_g * vx_teme + sin_g * vy_teme + omega_earth * y_ecef
    vy_ecef = -sin_g * vx_teme + cos_g * vy_teme - omega_earth * x_ecef
    vz_ecef = vz_teme

    return {
        "x": x_ecef, "y": y_ecef, "z": z_ecef,
        "vx": vx_ecef, "vy": vy_ecef, "vz": vz_ecef,
    }


def ecef_to_geodetic(x, y, z):
    """Convert ECEF (km) to geodetic coordinates (lat°, lon°, alt km)."""
    a = 6378.137
    f = 1 / 298.257223563
    b = a * (1 - f)
    e2 = 1 - (b * b) / (a * a)

    lon = math.atan2(y, x)
    p = math.sqrt(x * x + y * y)
    lat = math.atan2(z, p * (1 - e2))

    for _ in range(10):
        sin_lat = math.sin(lat)
        N = a / math.sqrt(1 - e2 * sin_lat * sin_lat)
        lat = math.atan2(z + e2 * N * sin_lat, p)

    sin_lat = math.sin(lat)
    N = a / math.sqrt(1 - e2 * sin_lat * sin_lat)

    if abs(math.cos(lat)) > 1e-10:
        alt = p / math.cos(lat) - N
    else:
        alt = abs(z) - b

    return {
        "lat": math.degrees(lat),
        "lon": math.degrees(lon),
        "alt": alt,
    }


# ─── Satrec Construction from OMM JSON ──────────────────────────

def _epoch_to_jd(epoch_str: str) -> tuple:
    """Convert ISO epoch string to Julian Date (jd, fr) pair."""
    try:
        dt = datetime.fromisoformat(epoch_str.replace("Z", "+00:00"))
    except:
        dt = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    jd_val, fr_val = jday(
        dt.year, dt.month, dt.day,
        dt.hour, dt.minute,
        dt.second + dt.microsecond / 1e6,
    )
    return jd_val, fr_val


def _epoch_to_dsince(epoch_str: str) -> float:
    """Compute days since epoch year for Satrec initialization."""
    try:
        dt = datetime.fromisoformat(epoch_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
    except:
        return 0.0
    year_start = datetime(dt.year, 1, 1, tzinfo=timezone.utc)
    diff = dt - year_start
    return diff.total_seconds() / 86400.0 + 1.0  # Day of year (1-indexed)


def create_satrec_from_omm(sat_data: dict) -> Satrec | None:
    """
    Construct a Satrec object from OMM JSON elements.
    
    CelesTrak's JSON format provides orbital elements directly
    instead of TLE lines. This function initializes SGP4 with 
    those elements using the sgp4 library's low-level API.
    """
    try:
        # First check if TLE lines are available
        tle1 = sat_data.get("TLE_LINE1", "")
        tle2 = sat_data.get("TLE_LINE2", "")
        if tle1 and tle2:
            return Satrec.twoline2rv(tle1, tle2)

        # Otherwise, construct from OMM elements
        epoch_str = sat_data.get("EPOCH", "")
        if not epoch_str:
            return None

        satrec = Satrec()

        # Epoch
        try:
            epoch_dt = datetime.fromisoformat(epoch_str.replace("Z", "+00:00"))
            if epoch_dt.tzinfo is None:
                epoch_dt = epoch_dt.replace(tzinfo=timezone.utc)
        except:
            return None

        epoch_jd, epoch_fr = jday(
            epoch_dt.year, epoch_dt.month, epoch_dt.day,
            epoch_dt.hour, epoch_dt.minute,
            epoch_dt.second + epoch_dt.microsecond / 1e6,
        )

        # Orbital elements (convert degrees to radians where needed)
        deg2rad = math.pi / 180.0

        no_kozai = float(sat_data.get("MEAN_MOTION", 0.0))  # rev/day
        # Convert rev/day to rad/min for SGP4
        no_kozai_rad_min = no_kozai * 2.0 * math.pi / 1440.0

        ecco = float(sat_data.get("ECCENTRICITY", 0.0))
        inclo = float(sat_data.get("INCLINATION", 0.0)) * deg2rad
        nodeo = float(sat_data.get("RA_OF_ASC_NODE", 0.0)) * deg2rad
        argpo = float(sat_data.get("ARG_OF_PERICENTER", 0.0)) * deg2rad
        mo = float(sat_data.get("MEAN_ANOMALY", 0.0)) * deg2rad
        bstar = float(sat_data.get("BSTAR", 0.0))

        # Mean motion derivatives
        ndot = float(sat_data.get("MEAN_MOTION_DOT", 0.0))
        # Convert from rev/day² to rad/min² (divide by 1440² and multiply by 2π)
        ndot_rad = ndot * 2.0 * math.pi / (1440.0 * 1440.0)

        nddot = float(sat_data.get("MEAN_MOTION_DDOT", 0.0))
        nddot_rad = nddot * 2.0 * math.pi / (1440.0 ** 3)

        # Classification and IDs
        satnum = int(sat_data.get("NORAD_CAT_ID", 0))
        epoch_year = epoch_dt.year % 100
        epoch_days = _epoch_to_dsince(epoch_str)

        # Initialize the Satrec using sgp4init
        # WGS72 gravity model is standard for SGP4
        satrec.sgp4init(
            WGS72,                  # gravity model
            'i',                    # improved mode
            satnum,                 # satellite number
            epoch_jd + epoch_fr - 2433281.5,  # epoch (days since 1949 Dec 31)
            bstar,                  # bstar drag
            ndot_rad,               # ndot (ballistic coefficient)
            nddot_rad,              # nddot
            ecco,                   # eccentricity
            argpo,                  # argument of perigee (rad)
            inclo,                  # inclination (rad)
            mo,                     # mean anomaly (rad)
            no_kozai_rad_min,       # mean motion (rad/min)
            nodeo,                  # RAAN (rad)
        )

        if satrec.error != 0:
            print(f"[ORBIT] sgp4init error {satrec.error} for {sat_data.get('OBJECT_NAME', 'UNKNOWN')}")
            return None

        return satrec

    except Exception as e:
        print(f"[ORBIT] Failed to create Satrec from OMM: {e}")
        return None


# ─── SGP4 Propagation ───────────────────────────────────────────

def propagate_from_satrec(satrec: Satrec, target_time: datetime) -> dict | None:
    """Propagate using an already-constructed Satrec object."""
    if target_time is None:
        target_time = datetime.now(timezone.utc)
    elif target_time.tzinfo is None:
        target_time = target_time.replace(tzinfo=timezone.utc)

    jd_val, fr_val = jday(
        target_time.year, target_time.month, target_time.day,
        target_time.hour, target_time.minute,
        target_time.second + target_time.microsecond / 1e6,
    )

    error_code, position, velocity = satrec.sgp4(jd_val, fr_val)

    if error_code != 0:
        return None

    x, y, z = position
    vx, vy, vz = velocity

    # Check for NaN or invalid values
    if any(math.isnan(v) for v in [x, y, z, vx, vy, vz]):
        return None

    ecef = teme_to_ecef(x, y, z, vx, vy, vz, target_time)
    geo = ecef_to_geodetic(ecef["x"], ecef["y"], ecef["z"])

    return {
        "x_teme": round(x, 4),
        "y_teme": round(y, 4),
        "z_teme": round(z, 4),
        "vx_teme": round(vx, 6),
        "vy_teme": round(vy, 6),
        "vz_teme": round(vz, 6),
        "x": round(x / EARTH_RADIUS_KM, 6),
        "y": round(y / EARTH_RADIUS_KM, 6),
        "z": round(z / EARTH_RADIUS_KM, 6),
        "vx": round(vx, 6),
        "vy": round(vy, 6),
        "vz": round(vz, 6),
        "lat": round(geo["lat"], 4),
        "lon": round(geo["lon"], 4),
        "alt": round(geo["alt"], 2),
        "time": target_time.isoformat(),
    }


def propagate_satellite(tle_line1: str, tle_line2: str,
                        target_time: datetime = None,
                        omm_data: dict = None) -> dict | None:
    """
    Propagate a satellite to a specific time using SGP4.
    
    Supports both TLE lines and OMM JSON data.
    If omm_data is provided, it takes priority for Satrec construction.
    """
    if target_time is None:
        target_time = datetime.now(timezone.utc)
    elif target_time.tzinfo is None:
        target_time = target_time.replace(tzinfo=timezone.utc)

    satrec = None

    # Try OMM data first
    if omm_data:
        satrec = create_satrec_from_omm(omm_data)

    # Fall back to TLE lines
    if satrec is None and tle_line1 and tle_line2:
        try:
            satrec = Satrec.twoline2rv(tle_line1, tle_line2)
        except Exception as e:
            print(f"[ORBIT] Failed to parse TLE: {e}")
            return None

    if satrec is None:
        return None

    return propagate_from_satrec(satrec, target_time)


def propagate_all(satellites: list[dict],
                  target_time: datetime = None) -> list[SatellitePosition]:
    """
    Batch propagation for all loaded satellites.
    Tries OMM elements first, falls back to TLE lines.
    """
    if target_time is None:
        target_time = datetime.now(timezone.utc)

    results = []
    for sat in satellites:
        tle1 = sat.get("TLE_LINE1", "")
        tle2 = sat.get("TLE_LINE2", "")

        # Use OMM data for Satrec construction
        pos = propagate_satellite(tle1, tle2, target_time, omm_data=sat)
        if pos is None:
            continue

        results.append(SatellitePosition(
            norad_id=int(sat.get("NORAD_CAT_ID", 0)),
            name=sat.get("OBJECT_NAME", "UNKNOWN"),
            time=pos["time"],
            x=pos["x"], y=pos["y"], z=pos["z"],
            vx=pos["vx"], vy=pos["vy"], vz=pos["vz"],
            lat=pos["lat"], lon=pos["lon"], alt=pos["alt"],
        ))

    return results


def get_orbit_trail(tle_line1: str, tle_line2: str,
                    center_time: datetime = None,
                    duration_minutes: int = ORBIT_TRAIL_MINUTES,
                    step_seconds: int = ORBIT_TRAIL_STEP_SECONDS,
                    omm_data: dict = None) -> list[dict]:
    """
    Generate a series of positions for orbit trail visualization.
    """
    if center_time is None:
        center_time = datetime.now(timezone.utc)

    # Build satrec once, reuse for all time steps
    satrec = None
    if omm_data:
        satrec = create_satrec_from_omm(omm_data)
    if satrec is None and tle_line1 and tle_line2:
        try:
            satrec = Satrec.twoline2rv(tle_line1, tle_line2)
        except:
            return []
    if satrec is None:
        return []

    half_duration = timedelta(minutes=duration_minutes / 2)
    start = center_time - half_duration
    step = timedelta(seconds=step_seconds)

    trail = []
    current = start
    end = center_time + half_duration

    while current <= end:
        pos = propagate_from_satrec(satrec, current)
        if pos:
            trail.append({
                "x": pos["x"],
                "y": pos["y"],
                "z": pos["z"],
                "time": current.isoformat(),
            })
        current += step

    return trail
