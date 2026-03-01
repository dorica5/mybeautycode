import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

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
