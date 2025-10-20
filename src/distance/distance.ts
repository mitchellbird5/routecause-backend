// src/distance/distance.ts
import { 
  TimeHM, 
  Coordinates, 
  OsrmResult, 
  OsrmRoute, 
  queryOsrmFn, 
  geocodeAddressFn, 
  geocodeMultiAddressFn,
  AddressCoordinates,
  getOsrmRouteFn, 
  OsrmOverview,
  convertMinutesFn 
} from "./distance.types";
import axios from "axios";
import polyline from "@mapbox/polyline";


/**
 * Geocode an address using OpenStreetMap Nominatim API
 * openstreetmap.org/copyright
 */
export const geocodeAddress: geocodeAddressFn = async (
  address: string
): Promise<Coordinates> => {
  // Use NOMINATIM_URL from environment, default to public API if not set
  const baseUrl = process.env.NOMINATIM_URL;
  const url = `${baseUrl}/search?format=json&q=${encodeURIComponent(address)}`;

  let response;
  try {
    response = await axios.get(url, {
      headers: { "User-Agent": "MyTravelApp/1.0" },
      timeout: 10000, // 10s timeout
    });
    console.log("Geocode response:", response.data);
  } catch (err) {
    console.error("Geocode request failed:", err);
    if (axios.isAxiosError(err)) {
      console.error("Axios error config:", err.config);
      console.error("Axios response:", err.response?.status, err.response?.data);
    }
    throw new Error(`Failed to geocode address "${address}": ${(err as Error).message}`);
  }

  if (!response.data || response.data.length === 0) {
    throw new Error(`Address not found: "${address}"`);
  }

  return {
    latitude: response.data[0].lat,
    longitude: response.data[0].lon,
  };
}

export const geocodeMultiAddress: geocodeMultiAddressFn = async (
  address: string,
  limit: number
): Promise<AddressCoordinates[]> => {
  const baseUrl = process.env.NOMINATIM_URL;
  const url = `${baseUrl}/search?format=json&q=${encodeURIComponent(address)}&limit=${limit}`;

  let response;
  try {
    response = await axios.get(url, {
      headers: { "User-Agent": "MyTravelApp/1.0" },
      timeout: 10000, // 10s timeout
    });
    console.log("Geocode response:", response.data);
  } catch (err) {
    console.error("Geocode request failed:", err);
    if (axios.isAxiosError(err)) {
      console.error("Axios error config:", err.config);
      console.error("Axios response:", err.response?.status, err.response?.data);
    }
    throw new Error(`Failed to geocode address "${address}": ${(err as Error).message}`);
  }

  if (!response.data || response.data.length === 0) {
    throw new Error(`Address not found: "${address}"`);
  }
  if (!Array.isArray(response.data)) {
    throw new Error('API return not an array');
  }

  return response.data.map((item: any) => ({
    address: item.display_name,
    coordinates : {
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    },
  }));
};


/**
 * Reverse geocode coordinates using OpenStreetMap Nominatim API
 * openstreetmap.org/copyright
 */
export const reverseGeocodeCoordinates = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  const baseUrl = process.env.NOMINATIM_URL;
  const url = `${baseUrl}/reverse?format=json&lat=${latitude}&lon=${longitude}`;

  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": "MyTravelApp/1.0" },
      timeout: 10000, // 10s timeout
    });

    if (!response.data || !response.data.display_name) {
      throw new Error("Address not found for coordinates");
    }

    return response.data.display_name;
  } catch (err: any) {
    console.error("Reverse geocode request failed:", err);
    throw new Error(`Failed to reverse geocode coordinates: ${err.message}`);
  }
};



/**
 * Query OSRM server for distance and duration
 * https://project-osrm.org/
 */
export const queryOsrm: queryOsrmFn = async (
  start: Coordinates,
  end: Coordinates,
  overview: OsrmOverview
): Promise<OsrmResult> => {
  const startStr = `${start.longitude},${start.latitude}`;
  const endStr = `${end.longitude},${end.latitude}`;
  const url = `${process.env.OSRM_URL}/route/v1/driving/${startStr};${endStr}?overview=${overview}&geometries=polyline`;

  try {
    const response = await axios.get(url);

    if (response.status !== 200) {
      throw new Error(
        `OSRM request failed: ${response.status} ${response.statusText}`
      );
    }

    const route = response.data.routes[0];

    let geometryCoords: OsrmRoute = [];

    if (route.geometry) {
      geometryCoords = polyline.decode(route.geometry) as OsrmRoute;
    }

    const result: OsrmResult = {
      distance_km: route.distance / 1000,
      duration_min: route.duration / 60,
    };

    if (geometryCoords.length > 0) {
      result.route = geometryCoords;
    }

    return result;
  } catch (err: any) {
    console.error("Error in queryOsrm:", err);
    throw new Error(`OSRM request failed: ${err.message}`);
  }
};


/**
 * Get OSRM route by addresses
 * https://project-osrm.org/
 */
export const getOsrmRoute: getOsrmRouteFn = async (
  startAddress: string, 
  endAddress: string,
  deps: {
    geocodeAddress: geocodeAddressFn,
    queryOsrm: queryOsrmFn
  },
  overview: OsrmOverview
): Promise<OsrmResult> => {
  const startCoords = await deps.geocodeAddress(startAddress);
  const endCoords = await deps.geocodeAddress(endAddress);

  try {
    return await deps.queryOsrm(startCoords, endCoords, overview);
  } catch (err: any) {
    throw new Error(
      `Error querying OSRM: Start=(${startCoords.latitude},${startCoords.longitude}), End=(${endCoords.latitude},${endCoords.longitude}) ${err.message}`
    );
  }
};


/**
 * Converts total minutes into hours and minutes.
 */
export const convertMinutes: convertMinutesFn = (
  totalMinutes: number
): TimeHM => {
  if (totalMinutes < 0) throw new Error("totalMinutes cannot be negative");
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
};


/**
 * Haversine formula to calculate great-circle distance (km)
 */
export function haversineKm(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371.0;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(coord1.latitude)) *
      Math.cos(toRad(coord2.latitude)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}