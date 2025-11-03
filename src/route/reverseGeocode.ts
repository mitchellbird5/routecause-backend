import axios from "axios";
import { getOrsApiKey, getGeocodeBaseUrl } from "./apiKeys";
import { reverseGeocodeFn } from "./route.types";
import { apiRateLimiter } from "../utils/rateLimiter";


async function callReverseGeocodeApi(
  url:string
) {
  const response = await axios.get(url, {
    headers: { "User-Agent": "DriveZero/1.0" },
    timeout: 10000,
  });

  if (!response.data || !response.data.display_name) {
    throw new Error("Address not found for coordinates");
  }

  return response
};

/**
 * Local reverse geocoder (Nominatim)
 */
const reverseGeocodeLocal: reverseGeocodeFn = async (
  latitude: number,
  longitude: number,
): Promise<string> => {
  const baseUrl = getGeocodeBaseUrl();
  const url = `${baseUrl}/reverse?format=json&lat=${latitude}&lon=${longitude}`;
  const response = await callReverseGeocodeApi(url);
  return response.data.display_name;
};


/**
 * Reverse geocode coordinates using OpenStreetMap Nominatim API
 * openstreetmap.org/copyright
 */
const orsReverseGeocodeRateLimiter = new apiRateLimiter(100, 1000);
const reverseGeocodeORS: reverseGeocodeFn = async (
  latitude: number,
  longitude: number,
): Promise<string> => {
  orsReverseGeocodeRateLimiter.consume()
  const apiKey = getOrsApiKey();
  const baseUrl = getGeocodeBaseUrl();
  const url = `${baseUrl}/reverse?api_key=${apiKey}&point.lat=${latitude}&point.lon=${longitude}`;

  const response = await callReverseGeocodeApi(url);

  return response.data.features[0].properties.label;
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