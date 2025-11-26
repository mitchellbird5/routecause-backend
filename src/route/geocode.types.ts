import { Coordinates } from "./route.types";

export type geocodeAddressFn = (
  address: string
) => Promise<Coordinates>;

export interface AddressCoordinates {
  address: string;
  coordinates: Coordinates
}

export type geocodeMultiAddressFn = (
  address: string, 
  limit: number
) => Promise<AddressCoordinates[]>;


export type reverseGeocodeFn = (latitude: number, longitude: number) => Promise<string>;