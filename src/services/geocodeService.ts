import { geocodeAddress, reverseGeocodeCoordinates } from "../distance/distance";

export async function getGeocodeService(address: string) {
  if (!address || typeof address !== "string") {
    throw { status: 400, message: "Missing or invalid 'address' query param" };
  }

  return await geocodeAddress(address);
}

export async function getReverseGeocodeService(
  lat: number,
  lon: number
) {
  if (lat === undefined || lon === undefined || isNaN(lat) || isNaN(lon)) {
    throw { status: 400, message: "Invalid latitude or longitude" };
  }

  return await reverseGeocodeCoordinates(lat, lon);
}