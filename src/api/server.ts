import express from "express";
import cors from "cors";
import { router as apiRouter } from "./routes";

const app = express();
const PORT = 18080;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", apiRouter); // all routes prefixed with /api

// Start server
app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
})
.on("error", (err: any) => {
  console.error(`Failed to start server on port ${PORT}:`, err);
  process.exit(1);
});