import axios from "axios";
import { getOrsApiKey, getGeocodeBaseUrl } from "./apiKeys";
import { AddressCoordinates, geocodeMultiAddressFn } from "./route.types";
import { apiRateLimiter } from "../utils/rateLimiter";


async function callGeocodeMultiApi(
  url:string,
  address:string
){
  const response = await axios.get(url, {
    headers: { "User-Agent": "DriveZero/1.0" },
    timeout: 10000,
  });

  if (!Array.isArray(response.data) || response.data.length === 0) {
    throw new Error(`Address not found: "${address}"`);
  }

  return response
}

const geocodeMultiLocal: geocodeMultiAddressFn = async (
  address: string,
  limit: number
): Promise<AddressCoordinates[]> => {
  const baseUrl = getGeocodeBaseUrl();

  const url = `${baseUrl}/search?format=json&q=${encodeURIComponent(address)}&limit=${limit}`;
  const response = await callGeocodeMultiApi(url, address);

  return response.data.map((item: any) => ({
    address: item.display_name,
    coordinates: {
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    },
  }));
};

const orsGeocodeMultiRateLimiter = new apiRateLimiter(100, 1000);
const geocodeMultiORS: geocodeMultiAddressFn = async (
  address: string,
  limit: number,
): Promise<AddressCoordinates[]> => {
  orsGeocodeMultiRateLimiter.consume()

  const apiKey = getOrsApiKey();
  const baseUrl = getGeocodeBaseUrl();

  const url = `${baseUrl}/autocomplete?api_key=${apiKey}&text=${encodeURIComponent(address)}&size=${limit}`;
  const response = await callGeocodeMultiApi(url, address);

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