import { Router, Request, Response } from "express";
import { getVehiclesService } from "../services/vehicleService";
import { getTripService } from "../services/tripService";
import { getGeocodeService, getReverseGeocodeService } from "../services/geocodeService";

export const router = Router();

// -------------------------------
// GET /vehicles
// -------------------------------
router.get("/vehicles", async (req: Request, res: Response) => {
  const make = (req.query.make as string) || "";
  const model = (req.query.model as string) || "";
  const model_year = (req.query.year as string) || "";

  try {
    const vehicles = await getVehiclesService(make, model, model_year);
    res.status(200).json(vehicles);
  } catch (err) {
    const status = (err as any).status || 500;
    res.status(status).json({ error: (err as Error).message || (err as any).message });
  }
});

// -------------------------------
// POST /trip
// -------------------------------
router.post("/trip", async (req: Request, res: Response) => {
  try {
    const trip = await getTripService(req.body);
    res.status(200).json(trip);
  } catch (err) {
    const status = (err as any).status || 500;
    res.status(status).json({ error: (err as Error).message || (err as any).message });
  }
});

// -------------------------------
// GET /reverse-geocode
// -------------------------------
router.get("/reverse-geocode", async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);

  try {
    const address = await getReverseGeocodeService(lat, lon);
    res.status(200).json({ address });
  } catch (err) {
    const status = (err as any).status || 500;
    res.status(status).json({ error: (err as Error).message || (err as any).message });
  }
});

// -------------------------------
// GET /geocode
// -------------------------------
router.get("/geocode", async (req: Request, res: Response) => {
  const address = req.query.address as string;

  try {
    const coords = await getGeocodeService(address);
    res.status(200).json(coords);
  } catch (err) {
    const status = (err as any).status || 500;
    res.status(status).json({ error: (err as Error).message || (err as any).message });
  }
});
