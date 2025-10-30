// src/distance/distance.ts
import { 
  TimeHM, 
  Coordinates, 
  RouteResult, 
  RouteCoordinates, 
  queryRouteFn, 
  geocodeAddressFn, 
  geocodeMultiAddressFn,
  AddressCoordinates,
  convertMinutesFn, 
  getRouteFn,
  reverseGeocodeFn,
  RateLimiter
} from "./distance.types";
import axios from "axios";
import polyline from "@mapbox/polyline";
import { response } from "express";

function getOrsApiKey() {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey)
    throw new Error("ORS_API_KEY not defined in production environment");
  return apiKey
};

function getGeocodeBaseUrl(){
  const baseUrl = process.env.GEOCODE_URL!;
  if (!baseUrl)
    throw new Error("GEOCODE_URL not defined in production environment");
  return baseUrl
}

async function callGeocodeApi(url: string, address: string) {
  let response;

  try {
    response = await axios.get(url, {
      headers: { "User-Agent": "DriveZero/1.0" },
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

  if (!response.data || !response.data.features || response.data.features.length === 0) {
    throw new Error(`Address not found: "${address}"`);
  }

  return response;
}

/**
 * Geocode an address using OpenStreetMap Nominatim API
 * openstreetmap.org/copyright
 */
const geocodeAddressLocal: geocodeAddressFn = async (
  address: string
): Promise<Coordinates> => {
  const baseUrl = getGeocodeBaseUrl();
  const url = `${baseUrl}/search?format=json&q=${encodeURIComponent(address)}`;
  const response = await callGeocodeApi(url, address);
  return {
    latitude: response.data[0].lat,
    longitude: response.data[0].lon,
  };
}

const orsRateLimiter = new RateLimiter(100, 1000);
const geocodeAddressORS: geocodeAddressFn = async (
  address: string
): Promise<Coordinates> => {

  orsRateLimiter.consume();
  
  const apiKey = getOrsApiKey();
  const baseUrl = getGeocodeBaseUrl();
  const url = `${baseUrl}/search?api_key=${apiKey}&text=${encodeURIComponent(address)}&size=1`;
  
  const response = await callGeocodeApi(url, address);

  const coords = response.data.features[0].geometry.coordinates;
  return { longitude: coords[0], latitude: coords[1] };
}

export const geocodeAddress: geocodeAddressFn = async (
  address: string,
): Promise<Coordinates> => {
  const isProduction = process.env.NODE_ENV === "production";
  try {
    if (isProduction){
      return geocodeAddressORS(address);
    } else {
      return geocodeAddressLocal(address)
    }
  } catch (err) {
    console.error("Geocode request failed:", err);
    throw new Error(
      `Failed to geocode address "${address}": ${(err as Error).message}`
    );
  }
}

const geocodeMultiLocal: geocodeMultiAddressFn = async (
  address: string,
  limit: number
): Promise<AddressCoordinates[]> => {
  const baseUrl = process.env.GEOCODE_URL!;
  if (!baseUrl)
    throw new Error("GEOCODE_URL not defined in production environment");

  const url = `${baseUrl}/search?format=json&q=${encodeURIComponent(address)}&limit=${limit}`;

  const response = await axios.get(url, {
    headers: { "User-Agent": "DriveZero/1.0" },
    timeout: 10000,
  });

  if (!Array.isArray(response.data) || response.data.length === 0) {
    throw new Error(`Address not found: "${address}"`);
  }

  return response.data.map((item: any) => ({
    address: item.display_name,
    coordinates: {
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    },
  }));
};


const geocodeMultiORS: geocodeMultiAddressFn = async (
  address: string,
  limit: number,
): Promise<AddressCoordinates[]> => {

  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey)
    throw new Error("ORS_API_KEY not defined in production environment");

  const baseUrl = process.env.GEOCODE_URL!;
  if (!baseUrl)
    throw new Error("GEOCODE_URL not defined in production environment");

  const url = `${baseUrl}/autocomplete?api_key=${apiKey}&text=${encodeURIComponent(
    address
  )}&size=${limit}`;

  const response = await axios.get(url, {
    headers: { "User-Agent": "DriveZero/1.0" },
    timeout: 10000,
  });

  if (!response.data?.features?.length) {
    throw new Error(`Address not found: "${address}"`);
  }

  return response.data.features.map((f: any) => ({
    address: f.properties.label || f.properties.name,
    coordinates: {
      latitude: f.geometry.coordinates[1],
      longitude: f.geometry.coordinates[0],
    },
  }));
};

export const geocodeMultiAddress: geocodeMultiAddressFn = async (
  address: string,
  limit: number
): Promise<AddressCoordinates[]> => {
  const isProduction = process.env.NODE_ENV === "production";

  try {
    if (isProduction) {
      return await geocodeMultiORS(address, limit);
    } else {
      return await geocodeMultiLocal(address, limit);
    }
  } catch (err) {
    console.error("Geocode request failed:", err);
    throw new Error(
      `Failed to geocode address "${address}": ${(err as Error).message}`
    );
  }
};


/**
 * Local reverse geocoder (Nominatim)
 */
const reverseGeocodeLocal: reverseGeocodeFn = async (
  latitude: number,
  longitude: number,
): Promise<string> => {
  const baseUrl = process.env.GEOCODE_URL!;
  if (!baseUrl)
    throw new Error("GEOCODE_URL not defined in production environment");

  const url = `${baseUrl}/reverse?format=json&lat=${latitude}&lon=${longitude}`;

  const response = await axios.get(url, {
    headers: { "User-Agent": "DriveZero/1.0" },
    timeout: 10000,
  });

  if (!response.data || !response.data.display_name) {
    throw new Error("Address not found for coordinates");
  }

  return response.data.display_name;
};


/**
 * Reverse geocode coordinates using OpenStreetMap Nominatim API
 * openstreetmap.org/copyright
 */
const reverseGeocodeORS: reverseGeocodeFn = async (
  latitude: number,
  longitude: number,
): Promise<string> => {

  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey)
    throw new Error("ORS_API_KEY not defined in production environment");

  const baseUrl = process.env.GEOCODE_URL!;
  if (!baseUrl)
    throw new Error("GEOCODE_URL not defined in production environment");

  const url = `${baseUrl}/reverse?api_key=${apiKey}&point.lat=${latitude}&point.lon=${longitude}`;

  const response = await axios.get(url, {
    headers: { "User-Agent": "DriveZero/1.0" },
    timeout: 10000,
  });

  if (!response.data?.features?.length) {
    throw new Error("Address not found for coordinates");
  }

  // Pelias results typically include a "label" property with the full address
  const label =
    response.data.features[0].properties.label ||
    response.data.features[0].properties.name;

  if (!label) {
    throw new Error("No label found in reverse geocode response");
  }

  return label;
};


/**
 * Main function — automatically switches based on environment
 */
export const reverseGeocodeCoordinates: reverseGeocodeFn = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  const isProduction = process.env.NODE_ENV === "production";
  try {
    if (isProduction) {
      return await reverseGeocodeORS(latitude, longitude);
    } else {
      return await reverseGeocodeLocal(latitude, longitude);
    }
  } catch (err: any) {
    console.error("Reverse geocode request failed:", err);
    throw new Error(`Failed to reverse geocode coordinates: ${latitude} ${longitude} - ${err.message}`);
  }
};


export const queryRouteLocal: queryRouteFn = async (
  start: Coordinates,
  end: Coordinates,
): Promise<RouteResult> => {
  const baseUrl = process.env.ROUTER_URL!;
  const startStr = `${start.longitude},${start.latitude}`;
  const endStr = `${end.longitude},${end.latitude}`;
  const url = `${baseUrl}/route/v1/driving/${startStr};${endStr}?overview=full&geometries=polyline`;

  const response = await axios.get(url);

  if (response.status !== 200) {
    throw new Error(`OSRM request failed: ${response.status} ${response.statusText}`);
  }

  const route = response.data.routes[0];
  const geometryCoords: RouteCoordinates = route.geometry
    ? (polyline.decode(route.geometry) as RouteCoordinates)
    : [];

  const result: RouteResult = {
    distance_km: route.distance / 1000,
    duration_min: route.duration / 60,
  };

  if (geometryCoords.length > 0) result.route = geometryCoords;

  return result;
};

/**
 * OpenRouteService query (for production)
 * https://openrouteservice.org/dev/#/api-docs/v2/directions/{profile}/get
 */
export const queryRouteORS: queryRouteFn = async (
  start: Coordinates,
  end: Coordinates,
): Promise<RouteResult> => {

  const baseUrl = process.env.ROUTER_URL!;
  const apiKey = process.env.ORS_API_KEY

  const url = `${baseUrl}/driving-car`;
  const params = {
    api_key: apiKey,
    start: `${start.longitude},${start.latitude}`,
    end: `${end.longitude},${end.latitude}`,
  };

  const response = await axios.get(url, {
    params,
    timeout: 10000,
    headers: { "User-Agent": "DriveZero/1.0" },
  });

  if (!response.data?.routes?.length) {
    throw new Error("ORS did not return a valid route");
  }

  const route = response.data.routes[0];
  const geometryCoords: RouteCoordinates = route.geometry
    ? (polyline.decode(route.geometry) as RouteCoordinates)
    : [];

  const result: RouteResult = {
    distance_km: route.summary.distance / 1000,
    duration_min: route.summary.duration / 60,
  };

  if (geometryCoords.length > 0) result.route = geometryCoords;

  return result;
};

export const queryRoute: queryRouteFn = async (
  start: Coordinates,
  end: Coordinates,
): Promise<RouteResult> => {
  const isProduction = process.env.NODE_ENV === "production";
  try {
    if (isProduction) {
      return await queryRouteORS(start, end);
    } else {
      return await queryRouteLocal(start, end);
    }
  } catch (err: any) {
    console.error("Query route request failed:", err);
    throw new Error(`Error querying route: Start=(${start.latitude},${start.longitude}), End=(${end.latitude},${end.longitude}) ${err.message}`
    );
  }
}

/**
 * Main query function — automatically switches between local OSRM and ORS
 */
export const getRoute: getRouteFn = async (
  startAddress: string,
  endAddress: string,
  deps: {
    geocodeAddress: geocodeAddressFn;
    queryRoute: queryRouteFn;
  }
): Promise<RouteResult> => {
  const startCoords = await deps.geocodeAddress(startAddress);
  const endCoords = await deps.geocodeAddress(endAddress);

  try {
    return await deps.queryRoute(startCoords, endCoords);
  } catch (err: any) {
    throw new Error(
      `Error querying route: Start=(${startCoords.latitude},${startCoords.longitude}), End=(${endCoords.latitude},${endCoords.longitude}) ${err.message}`
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