import axios from "axios";
import { getOrsApiKey, getGeocodeBaseUrl } from "./apiKeys";
import { Coordinates } from "./route.types";
import { apiRateLimiter } from "../utils/rateLimiter";

type geocodeAddressFn = (
  address: string
) => Promise<Coordinates>;

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

  if (!response.data || response.data.length === 0) {
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

const orsGeocodeRateLimiter = new apiRateLimiter(100, 1000);
const geocodeAddressORS: geocodeAddressFn = async (
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