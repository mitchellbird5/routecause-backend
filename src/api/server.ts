import express from "express";
import cors from "cors";
import { router as apiRouter } from "./routes";

export const app = express();
let server: ReturnType<typeof app.listen>;

app.get("/api/health", (_req, res) => res.send("OK"));

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api", apiRouter);

if (require.main === module) {
  const PORT = 18080;

  server = app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });

  server.on("error", (err: any) => {
    console.error(`Failed to start server on port ${PORT}:`, err);
    process.exit(1);
  });

  // Handle ts-node-dev restart signal
  process.once("SIGUSR2", () => {
    console.log("SIGUSR2 received: closing server...");
    server.close(() => {
      process.kill(process.pid, "SIGUSR2");
    });
  });
}
