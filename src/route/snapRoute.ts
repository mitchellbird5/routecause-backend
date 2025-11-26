import axios from "axios";
import { LonLat } from "./route.types";
import { 
  getGeoSnapBaseUrl,
  getOrsApiKey
} from "../utils/getEnvVariables";

export class SnapError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;

    Object.setPrototypeOf(this, SnapError.prototype);
  }
}


export async function callSnapOrsApi(
  locations: LonLat[],
  radius: number
): Promise<LonLat[]> {
  const url = getGeoSnapBaseUrl();

  try {
    const response = await axios.post(
      url,
      {
        locations: locations, 
        radius: radius,
      },
      {
        headers: {
          "User-Agent": "RouteCause/1.0",
          "Accept": "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8",
          "Content-Type": "application/json; charset=utf-8",
          Authorization: getOrsApiKey(),
        },
        timeout: 10000,
        validateStatus: () => true,
      }
    );

    // log ORS error if present
    if (response.status !== 200) {
      const orsError = response.data?.error;
      if (orsError) {
        console.error(`ORS Snap to Road API error: ${orsError.message} (code ${orsError.code})`);
      }
    }

    if (response.data?.locations?.[0] === null) {
      const error: SnapError = new SnapError(
        520, 
        `ORS snap request failed: Could not find snappable point in ${radius*1e-3}km radius`
      );
      throw error;
    }

    const snappedLocations = response.data.locations;
    if (!snappedLocations) {
      throw new Error("Failed to snap coordinate via ORS Snap API");
    }

    return snappedLocations.map((l: { location: [number, number] }) => l.location);
  } catch (err: any) {
    console.error("ORS Snap to Road request failed:", err);
    throw err;
  }
}