import axios from "axios";
import { 
  getOrsApiKey, 
  getGeocodeBaseUrl,
} from "../utils/getEnvVariables";
import { reverseGeocodeFn } from "./geocode.types";
import { apiRateLimiter } from "../utils/rateLimiter";


async function callReverseGeocodeApi(
  url:string
) {
  let response;

  try {
    response = await axios.get(url, {
      headers: { "User-Agent": "RouteCause/1.0" },
      timeout: 10000, // 10s timeout
    });
    console.log("Geocode response:", response.data);
  } catch (err) {
    console.error("Geocode request failed:", err);

    if (axios.isAxiosError(err)) {
      console.error("Axios error config:", err.config);
      console.error("Axios response:", err.response?.status, err.response?.data);
    }

    throw err;
  }


  return response
};

/**
 * Reverse geocode coordinates using OpenStreetMap Nominatim API
 * openstreetmap.org/copyright
 */
const orsReverseGeocodeRateLimiter = new apiRateLimiter(100, 1000);
export const reverseGeocodeCoordinates: reverseGeocodeFn = async (
  latitude: number,
  longitude: number,
): Promise<string> => {
  orsReverseGeocodeRateLimiter.consume()
  const apiKey = getOrsApiKey();
  const baseUrl = getGeocodeBaseUrl();
  const url = `${baseUrl}/reverse?api_key=${encodeURIComponent(apiKey)}&point.lon=${longitude}&point.lat=${latitude}`;

  const response = await callReverseGeocodeApi(url);

  if (!response.data || !response.data.features[0].properties.label) {
    throw new Error("Address not found for coordinates");
  }

  return response.data.features[0].properties.label;
};