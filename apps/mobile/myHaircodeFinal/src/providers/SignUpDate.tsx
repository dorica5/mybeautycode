import { useEffect, useRef } from "react";
import { supabase } from "@/src/lib/supabase";
import { api } from "@/src/lib/apiClient";
import { useAuth } from "./AuthProvider";

export const useSyncSignupDate = () => {
  const { profile } = useAuth();
  const hasSynced = useRef(false);

  useEffect(() => {
    const syncSignupDate = async () => {
      if (!profile?.id || profile.signup_date || hasSynced.current) return;

      hasSynced.current = true;

      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user?.created_at) return;

      await api.put(`/api/profiles/${user.id}`, {
        signup_date: user.created_at,
      });
    };

    syncSignupDate();
  }, [profile?.id, profile?.signup_date]);
};
