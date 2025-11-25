import axios from "axios";
import { 
  getOrsApiKey, 
  getGeocodeBaseUrl,
} from "../utils/getEnvVariables";
import { Coordinates } from "./route.types";
import { apiRateLimiter } from "../utils/rateLimiter";
import { geocodeAddressFn } from "./geocode.types";

async function callGeocodeApi(url: string, address: string) {
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

    throw new Error(`Failed to geocode address "${address}": ${(err as Error).message}`);
  }

  if (!response.data || response.data.length === 0) {
    throw new Error(`Address not found: "${address}"`);
  }

  return response;
}


const orsGeocodeRateLimiter = new apiRateLimiter(100, 1000);
export const geocodeAddress: geocodeAddressFn = async (
  address: string
): Promise<Coordinates> => {

  orsGeocodeRateLimiter.consume();
  
  const apiKey = getOrsApiKey();
  const baseUrl = getGeocodeBaseUrl();
  const url = `${baseUrl}/search?api_key=${encodeURIComponent(apiKey)}&text=${encodeURIComponent(address)}&size=1`;

  const response = await callGeocodeApi(url, address);

  const coords = response.data.features[0].geometry.coordinates;
  return { longitude: coords[0], latitude: coords[1] };
}