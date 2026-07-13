import { createClient } from "@supabase/supabase-js";
import { prisma } from "../lib/prisma";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Removes a user from the app (auth + profile cascade).
 * Visits on client accounts stay available: professional_profile_id is cleared
 * before delete so clients keep their timeline data.
 */
export async function adminDeleteUserAccount(userId: string): Promise<void> {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!profile) {
    throw Object.assign(new Error("User not found."), { statusCode: 404 as const });
  }

  const professionalProfile = await prisma.professionalProfile.findUnique({
    where: { profileId: userId },
    select: { id: true },
  });

  if (professionalProfile) {
    await prisma.serviceRecord.updateMany({
      where: { professionalProfileId: professionalProfile.id },
      data: {
        professionalProfileId: null,
        clientProfessionalLinkId: null,
      },
    });
  }

  try {
    const { data: userFiles } = await supabase.storage
      .from("avatars")
      .list("", { limit: 100 });
    const toRemove = (userFiles ?? [])
      .filter((f) => f.name?.includes(userId))
      .map((f) => f.name!);
    if (toRemove.length > 0) {
      await supabase.storage.from("avatars").remove(toRemove);
    }
  } catch (err) {
    console.warn("[admin] avatar cleanup failed:", err);
  }

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    throw Object.assign(new Error(error.message || "Failed to delete user."), {
      statusCode: 500 as const,
    });
  }
}

export async function adminResolveReport(
  reportId: string,
  status: "reviewed" | "dismissed"
): Promise<void> {
  const row = await prisma.reportedUser.findUnique({
    where: { id: reportId },
    select: { id: true },
  });
  if (!row) {
    throw Object.assign(new Error("Report not found."), { statusCode: 404 as const });
  }
  await prisma.reportedUser.update({
    where: { id: reportId },
    data: { status, updatedAt: new Date() },
  });
}
