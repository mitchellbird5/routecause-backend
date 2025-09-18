// src/distance/distance.ts
import { TimeHM, Coordinates, OsrmResult } from "./distance_types";
import axios from "axios";


/**
 * Geocode an address using OpenStreetMap Nominatim API
 * openstreetmap.org/copyright
 */
export async function geocodeAddress(address: string): Promise<Coordinates> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

  const response = await axios.get(url, {
    headers: { "User-Agent": "MyTravelApp/1.0" },
  });

  if (!response.data || response.data.length === 0) {
    throw new Error("Address not found");
  }

  return {
    latitude: parseFloat(response.data[0].lat),
    longitude: parseFloat(response.data[0].lon),
  };
}


/**
 * Query OSRM server for distance and duration
 * https://project-osrm.org/
 */
export async function queryOsrm(
  start: Coordinates,
  end: Coordinates
): Promise<OsrmResult> {
  const startStr = `${start.longitude},${start.latitude}`;
  const endStr = `${end.longitude},${end.latitude}`;
  const url = `http://osrm:5000/route/v1/driving/${startStr};${endStr}?overview=false`;

  const response = await axios.get(url);

  if (response.status !== 200) {
    throw new Error(`OSRM request failed: ${response.status} ${response.statusText}`);
  }

  const route = response.data.routes[0];
  return { distance_km: route.distance / 1000, duration_min: route.duration / 60 };
}


/**
 * Get OSRM route by addresses
 * https://project-osrm.org/
 */
export async function getOsrmRoute(startAddress: string, endAddress: string): Promise<OsrmResult> {
  const startCoords = await geocodeAddress(startAddress);
  const endCoords = await geocodeAddress(endAddress);

  try {
    return await queryOsrm(startCoords, endCoords);
  } catch (err: any) {
    throw new Error(`Error querying OSRM: Start=(${startCoords.latitude},${startCoords.longitude}), End=(${endCoords.latitude},${endCoords.longitude}) ${err.message}`);
  }
}


/**
 * Converts total minutes into hours and minutes.
 */
export function convertMinutes(totalMinutes: number): TimeHM {
  if (totalMinutes < 0) throw new Error("totalMinutes cannot be negative");
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}


/**
 * Haversine formula to calculate great-circle distance (km)
 */
export function haversineKm(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371.0;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(coord1.latitude)) *
      Math.cos(toRad(coord2.latitude)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}