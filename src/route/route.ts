import axios, { AxiosResponse } from "axios";
import polyline from "@mapbox/polyline";
import {
  Coordinates,
  RouteResult,
  queryRouteFn,
  RouteCoordinates,
  decodeWayCategorySummary,
  WayCategory
} from "./route.types";
import { 
  getRouteBaseUrl, 
  getOrsApiKey,
  getNodeEnvironmentFlag 
} from "../utils/getEnvVariables";
import { apiRateLimiter } from "../utils/rateLimiter";

export class SnapError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;

    Object.setPrototypeOf(this, SnapError.prototype);
  }
}


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
          "User-Agent": "RouteCause/1.0",
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

    if (response.data?.locations?.[0] === null) {
      const error: SnapError = new SnapError(
        520, 
        `ORS snap request failed: Could not find snappable point in ${radius*1e-3}km radius`
      );
      throw error;
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

function convertCoordinateToLonLat(coord: Coordinates) {
  return [coord.longitude, coord.latitude]
}

async function callOrsRouteApi(
  url:string,
  start: Coordinates,
  end: Coordinates,
  apiKey: string 
): Promise<AxiosResponse> {

  const body = {
    coordinates: [
      convertCoordinateToLonLat(start),
      convertCoordinateToLonLat(end)
    ],
    extra_info: ["waycategory"]
  }

  try {
    const response = await axios.post(
      url,
      body, 
      {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Accept:
          "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8",
        Authorization: apiKey,
      },
      timeout: 30000,
      validateStatus: () => true,
    })

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

export async function callOrsRouteApiWithRetry(
  start: Coordinates,
  end: Coordinates,
  radius: number
): Promise<AxiosResponse> {
  const baseUrl = getRouteBaseUrl();
  const apiKey = getOrsApiKey();

  let response: AxiosResponse;

  try {
    response = await callOrsRouteApi(
      baseUrl,
      start,
      end,
      apiKey
    );
    return response;
  } catch (err: any) {
    if (err.code === 2010) {
      const snappedStart = await callSnapOrsApi(start, radius);
      const snappedEnd = await callSnapOrsApi(end, radius);

      // Retry with updated coordinates
      response = await callOrsRouteApi(
        baseUrl,
        snappedStart,
        snappedEnd,
        apiKey
      );
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

  const route = response.data.routes[0];
  const coordinates = polyline.decode(route.geometry) || [];
  
  const geometryCoords: RouteCoordinates = coordinates.map(
    ([lat, lon]: [number, number]) => ({
      latitude: lat,
      longitude: lon,
    })
  );

  const decoded = decodeWayCategorySummary(route.extras.waycategory.summary);
  const wayCategory = {
    summary: decoded,
    values: route.extras.waycategory.values
  } as WayCategory;

  const result: RouteResult = {
    distance_km: route.summary.distance / 1000,
    duration_min: route.summary.duration / 60,
    route: geometryCoords,
    wayCategory: wayCategory
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

    if (err instanceof SnapError) {
      throw err;
    }

    throw new Error(`Error querying route: Start=(${start.latitude},${start.longitude}), End=(${end.latitude},${end.longitude}) ${err.message}`
    );
  }
}