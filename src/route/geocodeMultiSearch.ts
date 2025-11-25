import axios from "axios";
import { 
  getOrsApiKey, 
  getGeocodeBaseUrl,
} from "../utils/getEnvVariables";
import { AddressCoordinates, geocodeMultiAddressFn } from "./geocode.types";
import { apiRateLimiter } from "../utils/rateLimiter";


async function callGeocodeMultiApi(
  url:string
){
  const response = await axios.get(url, {
    headers: { "User-Agent": "RouteCause/1.0" },
    timeout: 10000,
  });

  return response
}

const orsGeocodeMultiRateLimiter = new apiRateLimiter(100, 1000);
export const geocodeMultiAddress: geocodeMultiAddressFn = async (
  address: string,
  limit: number,
): Promise<AddressCoordinates[]> => {
  orsGeocodeMultiRateLimiter.consume()

  const apiKey = getOrsApiKey();
  const baseUrl = getGeocodeBaseUrl();

  const url = `${baseUrl}/autocomplete?api_key=${encodeURIComponent(apiKey)}&text=${encodeURIComponent(address)}&size=${limit}`;
  const response = await callGeocodeMultiApi(url);

  if (!Array.isArray(response.data.features) || response.data.features.length === 0) {
    const error: any = new Error(`Address not found: "${address}"`);
    error.status = 404;
    error.response = response;
    throw error;
  }

  return response.data.features.map((f: any) => ({
    address: f.properties.name,
    coordinates: {
      latitude: f.geometry.coordinates[1],
      longitude: f.geometry.coordinates[0],
    },
  }));
};
