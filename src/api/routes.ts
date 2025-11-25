import { Router, Request, Response } from "express";
import { fetchVehicleRecords } from "../vehicle/vehicle";
import { queryRoute } from "../route/route";
import { getGeocodeService, getGeocodeMultiService, getReverseGeocodeService } from "../services/geocodeService";
import { getEmissionsService } from "../services/emissionsService";
import { apiRateLimitExceededError } from "../utils/rateLimiter";
import validator from "validator";
import xss from "xss";


export const router = Router();

// -------------------------------
// GET /vehicles
// -------------------------------
router.get("/vehicles", async (req: Request, res: Response) => {
  const make = xss((req.query.make as string) || "").trim();
  const model = xss((req.query.model as string) || "").trim();
  const modelYear = xss((req.query.year as string) || "").trim();

  if (make.length > 50 || model.length > 50) {
    return res.status(400).json({ error: "Input too long" });
  }

  if (modelYear && !validator.isInt(modelYear, { min: 1995, max: new Date().getFullYear() + 1 })) {
    return res.status(400).json({ error: "Invalid model year" });
  }

  try {
    const vehicles = await fetchVehicleRecords(make, model, modelYear);;
    res.status(200).json(vehicles);
  } catch (err: any) {
    if (err instanceof apiRateLimitExceededError) {
      return res.status(429).json({
        error: err.message,
        limitFreq: err.limitFreq,
        timeToResetMs: err.timeToResetMs
      });
    }

    // Handle other errors with a status code
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }

    // Unexpected errors
    console.error("Unexpected error in /vehicles:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// -------------------------------
// POST /trip
// -------------------------------
router.post("/trip", async (req: Request, res: Response) => {
  const {
    locations,
    radius
  } = req.body;

  const snapRadius = parseFloat(radius);

  // Validate locations array
  if (!Array.isArray(locations) || locations.length === 0) {
    return res.status(400).json({ error: "Locations must be a non-empty array" });
  }

  for (const loc of locations) {
    if (
      typeof loc.latitude !== "number" ||
      typeof loc.longitude !== "number" ||
      loc.latitude < -90 || loc.latitude > 90 ||
      loc.longitude < -180 || loc.longitude > 180
    ) {
      return res.status(400).json({ error: "Invalid coordinates in locations" });
    }
  }

  try {
    const trip = await queryRoute(locations, snapRadius);
    res.status(200).json(trip);
  } catch (err: any) {
    if (err instanceof apiRateLimitExceededError) {
      return res.status(429).json({
        error: err.message,
        limitFreq: err.limitFreq,
        timeToResetMs: err.timeToResetMs,
      });
    }

    if (err.status) return res.status(err.status).json({ error: err.message });

    console.error("Unexpected error in /trip:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// -------------------------------
// GET /reverse-geocode
// -------------------------------
router.get("/reverse-geocode", async (req: Request, res: Response) => {
  try {
    const latStr = req.query.lat as string;
    const lonStr = req.query.lon as string;

    // Validate existence
    if (!latStr || !lonStr) {
      return res.status(400).json({ error: "Missing latitude or longitude" });
    }

    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    // Validate numeric ranges
    if (isNaN(lat) || isNaN(lon) || lat < -360 || lat > 360 || lon < -360 || lon > 360) {
      return res.status(400).json({ error: "Invalid latitude or longitude" });
    }

    const address = await getReverseGeocodeService(lat, lon);
    res.status(200).json({ address });
  } catch (err: any) {
    if (err instanceof apiRateLimitExceededError) {
      return res.status(429).json({
        error: err.message,
        limitFreq: err.limitFreq,
        timeToResetMs: err.timeToResetMs
      });
    }
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error("Unexpected error in /reverse-geocode:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// -------------------------------
// GET /geocode
// -------------------------------
router.get("/geocode", async (req: Request, res: Response) => {
  try {
    let address = (req.query.address as string) || "";
    address = xss(address).trim();

    if (!address || address.length > 200) {
      return res.status(400).json({ error: "Missing or invalid address" });
    }

    const coords = await getGeocodeService(address);
    res.status(200).json(coords);
  } catch (err: any) {
    if (err instanceof apiRateLimitExceededError) {
      return res.status(429).json({
        error: err.message,
        limitFreq: err.limitFreq,
        timeToResetMs: err.timeToResetMs
      });
    }
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error("Unexpected error in /geocode:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// -------------------------------
// GET /geocode-multi
// -------------------------------
router.get("/geocode-multi", async (req: Request, res: Response) => {
  try {
    let address = (req.query.address as string) || "";
    address = xss(address).trim();

    let limitStr = req.query.limit as string;
    const limit = parseInt(limitStr); // default limit

    if (!address || address.length > 200) {
      return res.status(400).json({ error: "Missing or invalid address" });
    }

    if (isNaN(limit) || limit < 1 || limit > 20) {
      return res.status(400).json({ error: "Invalid limit; must be 1-20" });
    }

    const suggestions = await getGeocodeMultiService(address, limit);
    res.status(200).json(suggestions);
  } catch (err: any) {
    if (err instanceof apiRateLimitExceededError) {
      return res.status(429).json({
        error: err.message,
        limitFreq: err.limitFreq,
        timeToResetMs: err.timeToResetMs
      });
    }
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error("Unexpected error in /geocode-multi:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// -------------------------------
// GET /emissions
// -------------------------------
router.get("/emissions-comparison", async (req: Request, res: Response) => {
  const column = req.query.column as string;
  const filter = req.query.filter as string;
  
  const emissionsQuery = req.query.emissions as string;
  const emissions: number[] = emissionsQuery
    .split(",")
    .map(e => parseFloat(e))
    .filter(e => !isNaN(e) && e >= 0);

  if (!emissions.length) {
    return res.status(400).json({ error: "Invalid emissions values" });
  }

  try {
    const results = await getEmissionsService(column, filter, emissions);
    res.status(200).json(results);
  } catch (err) {
    const status = (err as any).status || 500;
    res.status(status).json({ error: (err as Error).message || (err as any).message });
  }
});