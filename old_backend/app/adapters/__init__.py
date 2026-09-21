"""
Integration adapters for Maps, Hospital Telemetry, and Fleet AVL.
"""
from .base import MapsAdapter, HospitalAdapter, FleetAdapter, RouteResult, GeocodeResult
from .maps_adapter import get_maps_adapter, haversine_distance
from .hospital_adapter import get_hospital_adapter
from .fleet_adapter import get_fleet_adapter

__all__ = [
    "MapsAdapter",
    "HospitalAdapter",
    "FleetAdapter",
    "RouteResult",
    "GeocodeResult",
    "get_maps_adapter",
    "get_hospital_adapter",
    "get_fleet_adapter",
    "haversine_distance",
]
