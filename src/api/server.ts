import express from "express";
import cors from "cors";
import { router as apiRouter } from "./routes";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

export const app = express();
app.disable("x-powered-by");

// Security middleware
app.use(helmet(
  { 
    contentSecurityPolicy: false, 
    crossOriginEmbedderPolicy: false 
  }
));
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: false,
  methods: ["GET", "POST"]
}));
app.use(express.json({ limit: "1mb" }));

// Rate limiting
app.use("/api", rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.get("/api/health", (_req, res) => res.send("OK"));
app.use("/api", apiRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Request error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

if (require.main === module) {
  const PORT: number = Number(process.env.PORT) || 5000;
  const HOST = "0.0.0.0";

  const server = app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
  });

  // Graceful shutdown handlers
  const shutdown = (): void => {
    console.log("Gracefully shutting down...");
    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // For ts-node-dev restart signal
  process.once("SIGUSR2", () => {
    console.log("Restart signal received (SIGUSR2)");
    server.close(() => process.kill(process.pid, "SIGUSR2"));
  });

  // Handle unexpected errors safely
  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
    shutdown();
  });

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
    shutdown();
  });
}