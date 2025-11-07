import axios, { Axios, AxiosResponse } from "axios";
import polyline from "@mapbox/polyline";
import {
  Coordinates,
  RouteResult,
  queryRouteFn,
  RouteCoordinates,
  getRouteFn,
  geocodeAddressFn
} from "./route.types";
import { 
  getRouteBaseUrl, 
  getOrsApiKey,
  getNodeEnvironmentFlag 
} from "../utils/getEnvVariables";
import { apiRateLimiter } from "../utils/rateLimiter";

export async function callSnapOrsApi(
  coord: Coordinates,
  radius: number
): Promise<Coordinates> {
  const url = "https://api.openrouteservice.org/v2/snap/driving-car";

  try {
    const response = await axios.post(
      url,
      {
        locations: [[coord.longitude, coord.latitude]], 
        radius: radius,
      },
      {
        headers: {
          "User-Agent": "DriveZero/1.0",
          "Accept": "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8",
          "Content-Type": "application/json; charset=utf-8",
          Authorization: getOrsApiKey(),
        },
        timeout: 10000,
        validateStatus: () => true, // allow inspecting 4xx/5xx
      }
    );

    // log ORS error if present
    if (response.status !== 200) {
      const orsError = response.data?.error;
      if (orsError) {
        console.error(`ORS Snap to Road API error: ${orsError.message} (code ${orsError.code})`);
      }
    }

    const snappedLocation = response.data.locations?.[0]?.location;
    if (!snappedLocation) {
      throw new Error("Failed to snap coordinate via ORS Snap API");
    }

    return {
        latitude: snappedLocation[1],
        longitude: snappedLocation[0],
      };
  } catch (err: any) {
    console.error("ORS Snap to Road request failed:", err);
    throw err;
  }
}

function parseOrs2010ErrorCoordinates(errorMessage: string): Coordinates {
  // Match pattern: "<longitude> <latitude>" — both may be negative or decimal
  const match = errorMessage.match(/(-?\d+\.\d+)\s+(-?\d+\.\d+)/);

  if (!match) {
    throw new Error("Failed to parse unroutable coordinate from ORS error message");
  }

  const longitude = parseFloat(match[1]);
  const latitude = parseFloat(match[2]);

  return { latitude, longitude };
}

async function callOrsRouteApi(
  url:string,
): Promise<AxiosResponse> {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "DriveZero/1.0",
      },
      timeout: 30000,
      validateStatus: () => true,
    });

    // ORS returns structured error JSON
    if (response.status !== 200) {
      const orsError = response.data?.error;
      if (orsError?.code === 2010) {
        const error: any = new Error(`ORS request failed: ${orsError.message}`);
        error.code = orsError.code;
        error.response = response;
        throw error;
      }
    }

    return response;
  } catch (err: any) {
    console.error("Query route request failed:", err);
    throw err;
  }

};

async function callOrsRouteApiWithRetry(
  start: Coordinates,
  end: Coordinates,
  radius: number
): Promise<AxiosResponse> {
  const baseUrl = getRouteBaseUrl();
  const apiKey = getOrsApiKey();

  const buildUrl = (s: Coordinates, e: Coordinates) =>
    `${baseUrl}?api_key=${encodeURIComponent(apiKey)}&start=${s.longitude},${s.latitude}&end=${e.longitude},${e.latitude}`;

  let response: AxiosResponse;
  let currentStart = { ...start };
  let currentEnd = { ...end };
  const url = buildUrl(currentStart, currentEnd);

  try {
    response = await callOrsRouteApi(url);
    return response;
  } catch (err: any) {
    if (err.code === 2010) {
      const coordMatches = parseOrs2010ErrorCoordinates(err.message);
      const newCoord = await callSnapOrsApi(coordMatches, radius);

      // Determine whether to update start or end
      if (
        Math.abs(coordMatches.latitude - start.latitude) < 1e-6 &&
        Math.abs(coordMatches.longitude - start.longitude) < 1e-6
      ) {
        currentStart = newCoord;
      } else if (
        Math.abs(coordMatches.latitude - end.latitude) < 1e-6 &&
        Math.abs(coordMatches.longitude - end.longitude) < 1e-6
      ) {
        currentEnd = newCoord;
      } else {
        throw new Error("Parsed unroutable coordinate does not match start or end");
      }

      const snappedUrl = buildUrl(currentStart, currentEnd);
      console.log("Original URL:", buildUrl(start, end));
      console.log("Snapped URL:", snappedUrl);

      // Retry with updated coordinates
      response = await callOrsRouteApi(snappedUrl);
      return response;
    } else {
      throw err;
    }
  }
}

/**
 * OpenRouteService query (for production)
 * https://openrouteservice.org/dev/#/api-docs/v2/directions/{profile}/get
 */
const orsRouteRateLimiter = new apiRateLimiter(40, 2000);
export const queryRouteORS: queryRouteFn = 
async (
  start: Coordinates,
  end: Coordinates,
): Promise<RouteResult> => {
  orsRouteRateLimiter.consume()

  const response = await callOrsRouteApiWithRetry(start, end, 25e3);

  const route = response.data.features[0];
  const coordinates = route.geometry?.coordinates || [];
  
  const geometryCoords: RouteCoordinates = coordinates.map(
    ([lon, lat]: [number, number]) => ({
      latitude: lat,
      longitude: lon,
    })
  );

  const result: RouteResult = {
    distance_km: route.properties.summary.distance / 1000,
    duration_min: route.properties.summary.duration / 60,
    route: geometryCoords
  };

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

  const response = await axios.get(url);
  if (response.status !== 200) {
    throw new Error(`OSRM request failed: ${response.status} ${response.statusText}`);
  }

  const route = response.data.routes[0];


  const geometryCoords: RouteCoordinates = route.geometry
    ? (polyline.decode(route.geometry).map(
        ([lat, lng]: [number, number]) => ({
          latitude: lat,
          longitude: lng,
        })
      ) as RouteCoordinates)
    : [];

  const result: RouteResult = {
    distance_km: route.distance / 1000,
    duration_min: route.duration / 60,
    route: geometryCoords
  };

  return result;
};

export const queryRoute: queryRouteFn = async (
  start: Coordinates,
  end: Coordinates,
): Promise<RouteResult> => {
  const isProduction = getNodeEnvironmentFlag();
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