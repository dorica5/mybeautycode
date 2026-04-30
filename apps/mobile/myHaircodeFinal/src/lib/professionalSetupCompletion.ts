import { setLastAppSurface, setLastProfessionCode } from "@/src/lib/lastVisitPreference";
import { supabase } from "@/src/lib/supabase";
import type { PostHog } from "posthog-react-native";

export async function runProfessionalSetupCompletionSideEffects(opts: {
  userId: string;
  professionCode: string;
  profile: {
    first_name?: string | null;
    last_name?: string | null;
    full_name?: string | null;
    country?: string | null;
  } | null | undefined;
  posthog: PostHog | undefined;
}) {
  const { userId, professionCode, profile, posthog } = opts;
  await setLastAppSurface(userId, "professional");
  await setLastProfessionCode(userId, professionCode);

  posthog?.capture("Profile Completed", { role: "HAIRDRESSER" });

  const { data: user } = await supabase.auth.getUser();
  const display =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.full_name ||
    "";

  posthog?.identify(userId, {
    email: user?.user?.email ?? null,
    role: "HAIRDRESSER",
    name: display,
    country: profile?.country ?? null,
  });
}
