"""
TLE Data Service — Fetches and parses real satellite data from CelesTrak.
Uses the GP API with JSON format (OMM standard keywords).
Respects CelesTrak rate limits via local caching.
"""

import requests
from config import CELESTRAK_BASE_URL
from models.satellite import SatelliteInfo
from utils.cache import read_cache, write_cache


def fetch_tle_data(group: str = "stations") -> list[dict]:
    """
    Fetch TLE/OMM data from CelesTrak for a satellite group.
    Returns cached data if available and fresh (< 2 hours old).

    Args:
        group: CelesTrak group name (e.g., 'stations', 'active',
               'starlink', 'weather', 'resource', 'science',
               'gps-ops', 'galileo', 'last-30-days')

    Returns:
        List of satellite dictionaries with OMM fields.
    """
    # Check cache first
    cached = read_cache(group)
    if cached is not None:
        print(f"[TLE] Using cached data for group '{group}' ({len(cached)} satellites)")
        return cached

    # Fetch fresh data from CelesTrak
    url = f"{CELESTRAK_BASE_URL}?GROUP={group}&FORMAT=JSON"
    print(f"[TLE] Fetching from CelesTrak: {url}")

    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()

        # CelesTrak returns a JSON array of OMM objects
        raw_data = response.json()

        if not isinstance(raw_data, list):
            print(f"[TLE] Unexpected response format for group '{group}'")
            return []

        # Normalize and store
        satellites = []
        for sat in raw_data:
            satellites.append({
                "OBJECT_NAME": sat.get("OBJECT_NAME", "UNKNOWN"),
                "NORAD_CAT_ID": sat.get("NORAD_CAT_ID", 0),
                "OBJECT_ID": sat.get("OBJECT_ID", ""),
                "EPOCH": sat.get("EPOCH", ""),
                "MEAN_MOTION": sat.get("MEAN_MOTION", 0.0),
                "ECCENTRICITY": sat.get("ECCENTRICITY", 0.0),
                "INCLINATION": sat.get("INCLINATION", 0.0),
                "RA_OF_ASC_NODE": sat.get("RA_OF_ASC_NODE", 0.0),
                "ARG_OF_PERICENTER": sat.get("ARG_OF_PERICENTER", 0.0),
                "MEAN_ANOMALY": sat.get("MEAN_ANOMALY", 0.0),
                "BSTAR": sat.get("BSTAR", 0.0),
                "EPHEMERIS_TYPE": sat.get("EPHEMERIS_TYPE", 0),
                "ELEMENT_SET_NO": sat.get("ELEMENT_SET_NO", 0),
                "REV_AT_EPOCH": sat.get("REV_AT_EPOCH", 0),
                "MEAN_MOTION_DOT": sat.get("MEAN_MOTION_DOT", 0.0),
                "MEAN_MOTION_DDOT": sat.get("MEAN_MOTION_DDOT", 0.0),
                "TLE_LINE0": sat.get("TLE_LINE0", ""),
                "TLE_LINE1": sat.get("TLE_LINE1", ""),
                "TLE_LINE2": sat.get("TLE_LINE2", ""),
            })

        # Cache the result
        write_cache(group, satellites)
        print(f"[TLE] Fetched and cached {len(satellites)} satellites for group '{group}'")
        return satellites

    except requests.exceptions.RequestException as e:
        print(f"[TLE] Error fetching from CelesTrak: {e}")
        # Try stale cache as fallback
        stale = read_cache.__wrapped__(group) if hasattr(read_cache, '__wrapped__') else None
        if stale:
            print("[TLE] Using stale cache as fallback")
            return stale
        return []


def parse_satellite_info(sat_data: dict) -> SatelliteInfo:
    """Convert raw OMM dict into a SatelliteInfo model."""
    return SatelliteInfo(
        name=sat_data.get("OBJECT_NAME", "UNKNOWN"),
        norad_id=int(sat_data.get("NORAD_CAT_ID", 0)),
        intl_designator=sat_data.get("OBJECT_ID", ""),
        epoch=sat_data.get("EPOCH", ""),
        mean_motion=float(sat_data.get("MEAN_MOTION", 0.0)),
        eccentricity=float(sat_data.get("ECCENTRICITY", 0.0)),
        inclination=float(sat_data.get("INCLINATION", 0.0)),
        ra_of_asc_node=float(sat_data.get("RA_OF_ASC_NODE", 0.0)),
        arg_of_pericenter=float(sat_data.get("ARG_OF_PERICENTER", 0.0)),
        mean_anomaly=float(sat_data.get("MEAN_ANOMALY", 0.0)),
        bstar=float(sat_data.get("BSTAR", 0.0)),
        tle_line1=sat_data.get("TLE_LINE1", ""),
        tle_line2=sat_data.get("TLE_LINE2", ""),
    )


def fetch_satellite_by_norad(norad_id: int) -> dict | None:
    """Fetch TLE data for a single satellite by NORAD catalog number."""
    url = f"{CELESTRAK_BASE_URL}?CATNR={norad_id}&FORMAT=JSON"
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        data = response.json()
        if isinstance(data, list) and len(data) > 0:
            return data[0]
        return None
    except requests.exceptions.RequestException as e:
        print(f"[TLE] Error fetching NORAD {norad_id}: {e}")
        return None


def get_available_groups() -> list[dict]:
    """Return list of commonly available CelesTrak satellite groups."""
    return [
        {"id": "stations", "name": "Space Stations", "description": "ISS, CSS, and visiting vehicles"},
        {"id": "active", "name": "Active Satellites", "description": "All active satellites (~10,000+)"},
        {"id": "analyst", "name": "Analyst Satellites", "description": "Analyst objects from Space Fence"},
        {"id": "starlink", "name": "Starlink", "description": "SpaceX Starlink constellation"},
        {"id": "oneweb", "name": "OneWeb", "description": "OneWeb constellation"},
        {"id": "gps-ops", "name": "GPS Operational", "description": "GPS constellation"},
        {"id": "galileo", "name": "Galileo", "description": "Galileo navigation constellation"},
        {"id": "weather", "name": "Weather Satellites", "description": "Meteorological satellites"},
        {"id": "resource", "name": "Earth Resources", "description": "Earth observation satellites"},
        {"id": "science", "name": "Science", "description": "Scientific satellites"},
        {"id": "geo", "name": "Geostationary", "description": "Geostationary orbit satellites"},
        {"id": "iridium", "name": "Iridium", "description": "Iridium NEXT constellation"},
        {"id": "last-30-days", "name": "Last 30 Days", "description": "Recently launched objects"},
    ]
