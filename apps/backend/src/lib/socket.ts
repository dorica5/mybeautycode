import { Server } from "socket.io";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

export function setupSocket(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token ?? socket.handshake.headers?.authorization?.replace("Bearer ", "");
    if (!token || !JWT_SECRET) {
      return next(new Error("Authentication required"));
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
      (socket as unknown as { userId: string }).userId = decoded.sub;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = (socket as unknown as { userId: string }).userId;
    const room = `user:${userId}`;
    socket.join(room);
    socket.on("disconnect", () => {
      socket.leave(room);
    });
  });
}

export function emitToUser(io: Server, userId: string, event: string, data: unknown) {
  io.to(`user:${userId}`).emit(event, data);
}
