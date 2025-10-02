import {
    Router, 
    Request, 
    Response 
} from "express";
import { 
    fetchVehicleRecords, 
    selectVehicle 
} from "../vehicle/vehicle_data";
import { 
    calculateMultiStopTrip, 
    tripResultToJson 
} from "../trip/trip";
import { 
    getOsrmRoute, 
    geocodeAddress, 
    queryOsrm, 
    convertMinutes,
    reverseGeocodeCoordinates 
} from "../distance/distance";
import { OsrmOverview } from "../distance/distance.types";

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

    if (
        !body.vehicle_id || 
        !body.make || 
        !body.model || 
        !body.model_year
    ) {
        res.status(400).json({ error: "Missing vehicle_id or vehicle info" });
        return;
    }

    if (!Object.values(OsrmOverview).includes(body.overview)) {
        return res.status(600).json({ error: "Invalid overview value. Must be equal to 'full' or 'false'." });
    }
    const overview = body.overview as OsrmOverview;

    try {
        const vehicles = await fetchVehicleRecords(
            body.make, 
            body.model,
            body.model_year
        );
        const vehicle = selectVehicle(vehicles, parseInt(body.vehicle_id) - 1);

        if (!vehicle || !vehicle.make) {
            res.status(400).json({ error: "Vehicle not found" });
            return;
        }

        const trip = await calculateMultiStopTrip(
            body.locations, 
            vehicle, 
            {
                getOsrmRoute,
                convertMinutes,
                geocodeAddress,
                queryOsrm,
            },
            overview
        );

        res.status(200).json(tripResultToJson(trip));
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

/**
 * GET /reverse-geocode?lat=...&lon=...
 */
router.get("/reverse-geocode", async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ error: "Invalid latitude or longitude" });
  }

  try {
    const address = await reverseGeocodeCoordinates(lat, lon);
    res.status(200).json({ address });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});


/**
 * GET /geocode?address=...
 * Returns latitude/longitude for a given address using Nominatim
 */
router.get("/geocode", async (req: Request, res: Response) => {
  const { address } = req.query;

  if (!address || typeof address !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'address' query param" });
  }

  try {
    const coords = await geocodeAddress(address);
    return res.status(200).json(coords);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});