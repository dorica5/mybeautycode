import { prisma } from "../lib/prisma";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";

const PASSWORD_RESET_REDIRECT = "myhaircode://reset-password";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const authService = {
  async getProfile(userId: string) {
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: userId },
      });
      return profile;
    } catch (e) {
      console.error("getProfile:", userId, e);
      // Missing/invalid id should be findUnique → null; this catches DB/Prisma faults
      return null;
    }
  },

  async getUserStatus(userId: string) {
    const strike = await prisma.userStrike.findUnique({
      where: { userId },
    });

    const restriction = await prisma.userRestriction.findFirst({
      where: {
        userId,
        restrictedUntil: { gt: new Date() },
      },
    });

    const isBanned = strike?.isBanned ?? false;
    const isRestricted = strike?.isRestricted ?? !!restriction;
    const restrictionEnd = restriction?.restrictedUntil?.toISOString();
    const banReason = strike?.banReason;
    const canAct = !isBanned && !isRestricted;

    return {
      can_act: canAct,
      is_banned: isBanned,
      is_restricted: isRestricted,
      ban_reason: banReason,
      restriction_end: restrictionEnd,
      status: isBanned ? "banned" : isRestricted ? "restricted" : "active",
    };
  },

  async emailHasAccount(email: string): Promise<boolean> {
    const normalized = normalizeEmail(email);
    if (!normalized || !isValidEmail(normalized)) {
      return false;
    }

    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id::text
      FROM auth.users
      WHERE lower(email) = ${normalized}
      LIMIT 1
    `;
    return rows.length > 0;
  },

  async requestPasswordReset(
    email: string
  ): Promise<{ ok: true } | { ok: false; code: string }> {
    const normalized = normalizeEmail(email);
    if (!normalized || !isValidEmail(normalized)) {
      return { ok: false, code: "invalid_email" };
    }

    const exists = await this.emailHasAccount(normalized);
    if (!exists) {
      // Same response as success — do not reveal whether the email is registered.
      return { ok: true };
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
      redirectTo: PASSWORD_RESET_REDIRECT,
    });

    if (error) {
      console.error("requestPasswordReset:", error.message);
      return { ok: false, code: "send_failed" };
    }

    return { ok: true };
  },
};
