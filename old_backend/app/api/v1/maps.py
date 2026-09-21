import os
from typing import List, Tuple

from fastapi import APIRouter, Query
from pydantic import BaseModel

from ...adapters.maps_adapter import get_maps_adapter


router = APIRouter(
    prefix="/maps",
    tags=["Maps & Routing"]
)


# ============================================================
# RESPONSE MODELS
# ============================================================

class RouteResponse(BaseModel):
    distance_km: float
    duration_minutes: float
    polyline_coords: List[Tuple[float, float]]
    provider: str
    summary: str


class ReverseGeocodeResponse(BaseModel):
    formatted_address: str
    latitude: float
    longitude: float
    provider: str


# ============================================================
# MAP CONFIG
# ============================================================

@router.get("/config")
async def get_map_config():
    """
    Returns public frontend map configuration.

    MapTiler API keys used in browser maps are client-visible,
    so the key should be restricted from the MapTiler dashboard
    to your allowed domain/origin.
    """

    return {
        "maptiler_api_key": os.getenv("MAPTILER_API_KEY", "")
    }


# ============================================================
# ROAD ROUTING
# ============================================================

@router.get(
    "/route",
    response_model=RouteResponse
)
async def get_route(
    origin_lat: float = Query(
        ...,
        description="Origin latitude"
    ),
    origin_lng: float = Query(
        ...,
        description="Origin longitude"
    ),
    dest_lat: float = Query(
        ...,
        description="Destination latitude"
    ),
    dest_lng: float = Query(
        ...,
        description="Destination longitude"
    ),
):
    adapter = get_maps_adapter()

    route = await adapter.get_directions(
        origin_lat,
        origin_lng,
        dest_lat,
        dest_lng
    )

    return RouteResponse(
        distance_km=round(
            route.distance_km,
            2
        ),
        duration_minutes=round(
            route.duration_minutes,
            1
        ),
        polyline_coords=route.polyline_coords,
        provider=route.provider,
        summary=route.summary
    )


# ============================================================
# REVERSE GEOCODING
# ============================================================

@router.get(
    "/reverse-geocode",
    response_model=ReverseGeocodeResponse
)
async def reverse_geocode(
    lat: float = Query(
        ...,
        description="Latitude"
    ),
    lng: float = Query(
        ...,
        description="Longitude"
    )
):
    adapter = get_maps_adapter()

    result = await adapter.reverse_geocode(
        lat,
        lng
    )

    return ReverseGeocodeResponse(
        formatted_address=result.formatted_address,
        latitude=result.latitude,
        longitude=result.longitude,
        provider=result.provider
    )