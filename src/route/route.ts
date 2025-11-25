import axios, { AxiosResponse } from "axios";
import polyline from "@mapbox/polyline";
import {
  Coordinates,
  RouteResult,
  queryRouteFn,
  RouteCoordinates,
  decodeWayCategorySummary,
  WayCategory,
  convertCoordinateListToLonLat
} from "./route.types";
import { 
  getRouteBaseUrl, 
  getOrsApiKey,
} from "../utils/getEnvVariables";
import { apiRateLimiter } from "../utils/rateLimiter";
import { callSnapOrsApi } from "./snapRoute";

async function callOrsRouteApi(
  url:string,
  locations: [number, number][],
  apiKey: string 
): Promise<AxiosResponse> {

  const body = {
    coordinates: locations,
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


/**
 * OpenRouteService query (for production)
 * https://openrouteservice.org/dev/#/api-docs/v2/directions/{profile}/get
 */
const orsRouteRateLimiter = new apiRateLimiter(40, 2000);
export const queryRoute: queryRouteFn = 
async (
  coordinates: Coordinates[],
  radius: number
): Promise<RouteResult> => {
  orsRouteRateLimiter.consume()

  const snappedLocations = await callSnapOrsApi(
    convertCoordinateListToLonLat(coordinates),
    radius
  );

  const response = await callOrsRouteApi(
    getRouteBaseUrl(),
    snappedLocations,
    getOrsApiKey(),
  );

  const route = response.data.routes[0];
  const routeCoordinates = polyline.decode(route.geometry) || [];
  
  const geometryCoords: RouteCoordinates = routeCoordinates.map(
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