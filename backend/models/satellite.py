"""
Satellite data models for Forge-X.
Provides structured representations of satellite data, positions, and collision events.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional


@dataclass
class SatelliteInfo:
    """Core satellite metadata parsed from TLE/OMM data."""
    name: str
    norad_id: int
    intl_designator: str
    epoch: str
    mean_motion: float
    eccentricity: float
    inclination: float
    ra_of_asc_node: float
    arg_of_pericenter: float
    mean_anomaly: float
    bstar: float
    tle_line1: str
    tle_line2: str

    def to_dict(self):
        return asdict(self)


@dataclass
class SatellitePosition:
    """Position and velocity of a satellite at a given time."""
    norad_id: int
    name: str
    time: str  # ISO format string
    # ECI (TEME) coordinates in km
    x: float
    y: float
    z: float
    # Velocity in km/s
    vx: float
    vy: float
    vz: float
    # Geographic coordinates (ECEF → geodetic)
    lat: float
    lon: float
    alt: float  # altitude above Earth surface in km

    def to_dict(self):
        return asdict(self)


@dataclass
class CollisionEvent:
    """A detected potential collision / close approach between two satellites."""
    sat1_name: str
    sat1_norad_id: int
    sat2_name: str
    sat2_norad_id: int
    min_distance_km: float
    time_of_closest_approach: str  # ISO format
    relative_velocity_km_s: float
    risk_score: int
    risk_level: str  # LOW, MEDIUM, HIGH
    # Positions at closest approach
    sat1_position: Optional[dict] = field(default_factory=dict)
    sat2_position: Optional[dict] = field(default_factory=dict)

    def to_dict(self):
        return asdict(self)


@dataclass
class RiskAssessment:
    """Risk assessment for a satellite pair."""
    sat1_norad_id: int
    sat1_name: str
    sat2_norad_id: int
    sat2_name: str
    score: int
    level: str
    distance_km: float
    relative_velocity_km_s: float
    contributing_factors: dict = field(default_factory=dict)

    def to_dict(self):
        return asdict(self)
