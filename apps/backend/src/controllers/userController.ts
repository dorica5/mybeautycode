import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const userController = {
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
