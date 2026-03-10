import { Server } from "socket.io";
import { jwtVerify, createRemoteJWKSet } from "jose";

const SUPABASE_URL = process.env.SUPABASE_URL;
const JWKS_URL = SUPABASE_URL
  ? `${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`
  : null;
const projectJWKS = JWKS_URL ? createRemoteJWKSet(new URL(JWKS_URL)) : null;

export function setupSocket(io: Server) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token ?? socket.handshake.headers?.authorization?.replace("Bearer ", "");
    if (!token || !projectJWKS) {
      return next(new Error("Authentication required"));
    }
    try {
      const { payload } = await jwtVerify(token, projectJWKS);
      (socket as unknown as { userId: string }).userId = payload.sub as string;
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
