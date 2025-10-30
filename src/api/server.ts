import express from "express";
import cors from "cors";
import { router as apiRouter } from "./routes";
// import helmet from "helmet";

export const app = express();
// app.use(helmet());
let server: ReturnType<typeof app.listen>;

app.get("/api/health", (_req, res) => res.send("OK"));

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use("/api", apiRouter);

if (require.main === module) {
  const PORT = parseInt(String(process.env.PORT), 10) || 5000;

  server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
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
