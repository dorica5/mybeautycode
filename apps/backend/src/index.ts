import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

import { prisma } from "./lib/prisma";
import { setupSocket } from "./lib/socket";
import { authRoutes } from "./routes/auth";
import { profileRoutes } from "./routes/profiles";
import { haircodeRoutes } from "./routes/haircodes";
import { inspirationRoutes } from "./routes/inspirations";
import { relationshipRoutes } from "./routes/relationships";
import { moderationRoutes } from "./routes/moderation";
import { notificationRoutes } from "./routes/notifications";
import { storageRoutes } from "./routes/storage";
import { userRoutes } from "./routes/users";
import { sharedInspirationRoutes } from "./routes/sharedInspirations";
import { supportRoutes } from "./routes/support";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

setupSocket(io);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/** Fails fast with a clear message when Prisma cannot reach Postgres (paused project, wrong URL, firewall). */
app.get("/health/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(503).json({
      status: "error",
      database: "unreachable",
      message,
      hint:
        "Open Supabase → resume project if paused. Confirm DATABASE_URL. If db.xxx:5432 fails, use the pooler URI on port 6543 (Connect → Prisma). See apps/backend/.env.example.",
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/haircodes", haircodeRoutes);
app.use("/api/inspirations", inspirationRoutes);
app.use("/api/relationships", relationshipRoutes);
app.use("/api/moderation", moderationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/storage", storageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/shared-inspirations", sharedInspirationRoutes);
app.use("/api/support", supportRoutes);

app.set("io", io);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

export { io };
