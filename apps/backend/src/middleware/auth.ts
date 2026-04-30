import { Request, Response, NextFunction } from "express";
import { jwtVerify, createRemoteJWKSet } from "jose";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const JWKS_URL = SUPABASE_URL
  ? `${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`
  : null;

const projectJWKS = JWKS_URL ? createRemoteJWKSet(new URL(JWKS_URL)) : null;

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  if (!token) {
    return res.status(401).json({ error: "Missing or invalid authorization" });
  }

  if (!projectJWKS) {
    console.error("[auth] JWT verify failed: missing SUPABASE_URL");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  try {
    const { payload } = await jwtVerify(token, projectJWKS);
    req.userId = payload.sub as string;
    next();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[auth] JWT verify failed:", msg);
    if (/fetch/i.test(msg)) {
      console.error(
        "[auth] Hint: outbound HTTPS to SUPABASE_URL must succeed (JWKS). Check SUPABASE_URL, firewall, and VPN."
      );
    }
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  if (!token || !projectJWKS) {
    return next();
  }

  try {
    const { payload } = await jwtVerify(token, projectJWKS);
    req.userId = payload.sub as string;
  } catch {
    // ignore
  }
  next();
};
