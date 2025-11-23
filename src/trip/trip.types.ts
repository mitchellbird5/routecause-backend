import { RouteCoordinates, WayCategory } from "../route/route.types";

export interface TripResult {
    distance_km: number;
    hours: number;
    minutes: number;
    route?: RouteCoordinates
    wayCategory?: WayCategory
}

