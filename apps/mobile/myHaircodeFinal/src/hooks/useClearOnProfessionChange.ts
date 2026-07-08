import { useEffect, useRef } from "react";

/**
 * Clears ephemeral UI (search text, overlays) when the user switches profession lane
 * (hair ↔ brows ↔ nails). Tabs stay mounted, so local state would otherwise leak.
 */
export function useClearOnProfessionChange(
  activeProfessionCode: string | null,
  storedProfessionReady: boolean,
  clear: () => void
): void {
  const prevRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!storedProfessionReady) return;
    const prev = prevRef.current;
    prevRef.current = activeProfessionCode;
    if (prev !== undefined && prev !== activeProfessionCode) {
      clear();
    }
  }, [activeProfessionCode, storedProfessionReady, clear]);
}
