import { RouteCoordinates } from "../route/route.types";

export interface TripResult {
    distance_km: number;
    hours: number;
    minutes: number;
    fuel_used_l: number;
    co2_kg: number;
    route?: RouteCoordinates
}

