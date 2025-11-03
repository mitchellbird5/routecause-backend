import axios from "axios";
import polyline from "@mapbox/polyline";
import {
  Coordinates,
  RouteResult,
  queryRouteFn,
  RouteCoordinates,
  getRouteFn,
  geocodeAddressFn
} from "./route.types";
import { getRouteBaseUrl, getOrsApiKey } from "./apiKeys";
import { apiRateLimiter } from "../utils/rateLimiter";

async function callRouteApi(
  url:string
): Promise<RouteResult> {
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

  return result
};

export const queryRouteLocal: queryRouteFn = async (
  start: Coordinates,
  end: Coordinates,
): Promise<RouteResult> => {
  const baseUrl = getRouteBaseUrl();
  const startStr = `${start.longitude},${start.latitude}`;
  const endStr = `${end.longitude},${end.latitude}`;
  const url = `${baseUrl}/route/v1/driving/${startStr};${endStr}?overview=full&geometries=polyline`;
  return callRouteApi(url);
};

/**
 * OpenRouteService query (for production)
 * https://openrouteservice.org/dev/#/api-docs/v2/directions/{profile}/get
 */
const orsRouteRateLimiter = new apiRateLimiter(40, 2000);
export const queryRouteORS: queryRouteFn = async (
  start: Coordinates,
  end: Coordinates,
): Promise<RouteResult> => {
  orsRouteRateLimiter.consume()
  const baseUrl = getRouteBaseUrl();
  const apiKey = getOrsApiKey();
  const url = `${baseUrl}/driving-car?api_key=${apiKey}&\
  start=${start.longitude},${start.latitude}&end=${end.longitude},${end.latitude}`;
  return callRouteApi(url);
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