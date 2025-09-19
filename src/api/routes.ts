import { Router, Request, Response } from "express";
import { fetchVehicleRecords, selectVehicle } from "../vehicle/vehicle_data";
import { calculateTrip, tripResultToJson } from "../trip/trip";
import { getOsrmRoute, geocodeAddress, queryOsrm } from "../distance/distance";
import { convertMinutes } from "../distance/distance";

export const router = Router();

// -------------------------------
// GET /vehicles
// -------------------------------
router.get("/vehicles", async (req: Request, res: Response) => {
    const make = (req.query.make as string) || "";
    const model = (req.query.model as string) || "";
    const model_year = (req.query.year as string) || "";

    try {
        const vehicles = await fetchVehicleRecords(make, model, model_year);
        res.status(200).json(vehicles);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

// -------------------------------
// POST /trip
// -------------------------------
router.post("/trip", async (req: Request, res: Response) => {
    const body = req.body;

    if (!body.vehicle_id || !body.make || !body.model || !body.model_year) {
        res.status(400).json({ error: "Missing vehicle_id or vehicle info" });
        return;
    }

    const start = body.start || "";
    const end = body.end || "";
    const vehicle_id = parseInt(body.vehicle_id);

    try {
        const vehicles = await fetchVehicleRecords(body.make, body.model, body.model_year);
        const vehicle = selectVehicle(vehicles, vehicle_id - 1);

        if (!vehicle || !vehicle.make) {
            res.status(400).json({ error: "Vehicle not found" });
            return;
        }

        const trip = await calculateTrip(
            start, 
            end, 
            vehicle, {
                getOsrmRoute,
                convertMinutes,
                geocodeAddress,
                queryOsrm,
            }
        );
        res.status(200).json(tripResultToJson(trip));
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});
