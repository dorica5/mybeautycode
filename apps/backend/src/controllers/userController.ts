import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { deleteProfessionalLane as removeProfessionalLane } from "../services/accountDeletionService";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function readProfessionCodeQuery(q: Request["query"]): string | undefined {
  const raw =
    typeof q.profession_code === "string"
      ? q.profession_code
      : typeof q.professionCode === "string"
        ? q.professionCode
        : undefined;
  const t = raw?.trim();
  return t && t.length > 0 ? t : undefined;
}

function readProfessionCodeBody(body: unknown): string | undefined {
  if (body == null || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;
  const raw =
    typeof b.profession_code === "string"
      ? b.profession_code
      : typeof b.professionCode === "string"
        ? b.professionCode
        : undefined;
  const t = raw?.trim();
  return t && t.length > 0 ? t : undefined;
}

export const userController = {
  /** DELETE or POST — POST `/me/professional-lane/delete` is preferred (some proxies mishandle DELETE bodies). */
  async deleteProfessionalLane(req: Request, res: Response) {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const professionCode =
      readProfessionCodeQuery(req.query) ?? readProfessionCodeBody(req.body);
    if (!professionCode) {
      return res.status(400).json({ error: "profession_code is required." });
    }
    try {
      const result = await removeProfessionalLane(userId, professionCode);
      res.json(result);
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "statusCode" in err
          ? (err as { statusCode?: number }).statusCode
          : undefined;
      const msg =
        err instanceof Error ? err.message : "Failed to delete profession lane";
      if (code === 404) return res.status(404).json({ error: msg });
      if (code === 400) return res.status(400).json({ error: msg });
      console.error("deleteProfessionalLane:", err);
      res.status(500).json({ error: "Failed to delete profession lane" });
    }
  },

  /** Full account deletion (Supabase auth user — cascades profile & related DB rows). */
  async delete(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.userId!;
    if (userId !== id) {
      return res.status(403).json({ error: "Can only delete your own account" });
    }
    try {
      const { data: userFiles } = await supabase.storage
        .from("avatars")
        .list("", { limit: 100 });
      const toRemove = (userFiles ?? [])
        .filter((f) => f.name?.includes(id))
        .map((f) => f.name!);
      if (toRemove.length > 0) {
        await supabase.storage.from("avatars").remove(toRemove);
      }
      const { error } = await supabase.auth.admin.deleteUser(id);
      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error("user delete error:", err);
      res.status(500).json({ error: "Failed to delete user" });
    }
  },
};
