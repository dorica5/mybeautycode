import { useEffect, useRef, useState } from "react";

/**
 * Keeps local form state in sync with server values unless the user has edited
 * the field (prevents 30s profile refresh from wiping in-progress input).
 */
export function useDraftProtectedServerValue<T>(
  serverValue: T,
  equals: (a: T, b: T) => boolean = Object.is
): [T, (next: T) => void, () => void] {
  const [value, setValue] = useState(serverValue);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (dirtyRef.current) return;
    setValue((prev) => (equals(prev, serverValue) ? prev : serverValue));
  }, [serverValue, equals]);

  const setDraftValue = (next: T) => {
    dirtyRef.current = true;
    setValue(next);
  };

  const commitServerValue = () => {
    dirtyRef.current = false;
    setValue(serverValue);
  };

  return [value, setDraftValue, commitServerValue];
}
