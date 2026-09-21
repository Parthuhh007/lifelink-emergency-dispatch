from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple


class RouteResult:
    def __init__(
        self,
        distance_km: float,
        duration_minutes: float,
        polyline_coords: List[Tuple[float, float]],
        provider: str,
        summary: str = ""
    ):
        self.distance_km = round(distance_km, 2)
        self.duration_minutes = round(duration_minutes, 1)
        self.polyline_coords = polyline_coords
        self.provider = provider
        self.summary = summary

    def to_dict(self) -> Dict[str, Any]:
        return {
            "distance_km": self.distance_km,
            "duration_minutes": self.duration_minutes,
            "polyline_coords": self.polyline_coords,
            "provider": self.provider,
            "summary": self.summary,
        }


class GeocodeResult:
    def __init__(self, formatted_address: str, latitude: float, longitude: float, provider: str):
        self.formatted_address = formatted_address
        self.latitude = latitude
        self.longitude = longitude
        self.provider = provider

    def to_dict(self) -> Dict[str, Any]:
        return {
            "formatted_address": self.formatted_address,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "provider": self.provider,
        }


class MapsAdapter(ABC):
    """Abstract interface for all real-world and simulated mapping providers."""

    @abstractmethod
    async def geocode(self, address: str) -> GeocodeResult:
        """Geocode text address to real geographic coordinates."""
        pass

    @abstractmethod
    async def reverse_geocode(self, latitude: float, longitude: float) -> GeocodeResult:
        """Reverse geocode coordinates to street address."""
        pass

    @abstractmethod
    async def get_directions(
        self,
        origin_lat: float,
        origin_lng: float,
        dest_lat: float,
        dest_lng: float
    ) -> RouteResult:
        """Compute real road navigation route, distance, and estimated travel time."""
        pass

    @abstractmethod
    async def get_distance_matrix(
        self,
        origins: List[Tuple[float, float]],
        destinations: List[Tuple[float, float]]
    ) -> List[List[Dict[str, float]]]:
        """Compute pairwise distances and ETAs between multiple coordinates."""
        pass


class HospitalAdapter(ABC):
    """Abstract interface for hospital capacity and clinical telemetry integration."""

    @abstractmethod
    async def get_all_hospitals(self) -> List[Dict[str, Any]]:
        """Retrieve latest telemetry for all hospitals."""
        pass

    @abstractmethod
    async def get_hospital_by_id(self, hospital_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve single hospital telemetry."""
        pass

    @abstractmethod
    async def update_hospital_capacity(
        self,
        hospital_id: str,
        status: Optional[str] = None,
        icu_available: Optional[int] = None,
        ed_beds_available: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """Mutate or synchronize hospital bed availability."""
        pass


class FleetAdapter(ABC):
    """Abstract interface for ambulance AVL / CAD fleet telematics."""

    @abstractmethod
    async def get_all_ambulances(self) -> List[Dict[str, Any]]:
        """Retrieve current telematics for all vehicles."""
        pass

    @abstractmethod
    async def get_ambulance_by_id(self, ambulance_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve single vehicle telematics."""
        pass

    @abstractmethod
    async def update_ambulance_telemetry(
        self,
        ambulance_id: str,
        status: Optional[str] = None,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        eta_minutes: Optional[float] = None,
        assigned_emergency_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Update vehicle status and location."""
        pass
