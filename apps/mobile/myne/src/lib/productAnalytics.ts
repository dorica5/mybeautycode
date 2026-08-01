import { usePostHog } from "posthog-react-native";
import { useCallback } from "react";
import { recordProductEvent, type ProductEventInput } from "@/src/api/analytics";

/** Product analytics: PostHog (behavior) + backend activity log (admin dashboard). */
export function useProductAnalytics() {
  const posthog = usePostHog();

  return useCallback(
    (eventType: string, properties?: Record<string, unknown>) => {
      const payload = properties ?? {};
      try {
        posthog?.capture(eventType, payload);
      } catch {
        /* optional */
      }
      void recordProductEvent({
        eventType,
        payload,
        entityType:
          typeof payload.entityType === "string" ? payload.entityType : null,
        entityId: typeof payload.entityId === "string" ? payload.entityId : null,
      });
    },
    [posthog]
  );
}

export function trackProductEvent(
  posthog: ReturnType<typeof usePostHog> | undefined,
  eventType: string,
  properties?: Record<string, unknown>
) {
  const payload = properties ?? {};
  try {
    posthog?.capture(eventType, payload);
  } catch {
    /* optional */
  }
  void recordProductEvent({
    eventType,
    payload,
    entityType:
      typeof payload.entityType === "string" ? payload.entityType : null,
    entityId: typeof payload.entityId === "string" ? payload.entityId : null,
  });
}

export type { ProductEventInput };
