import React, { createContext, useContext, useRef } from "react";

const RealTimeContext = createContext<{
  addListener: (eventType: string, callback: (data: unknown) => void) => () => void;
  emit: (eventType: string, data: unknown) => void;
}>({
  addListener: () => () => {},
  emit: () => {},
});

export const useRealTime = () => {
  return useContext(RealTimeContext);
};

export const RealTimeProvider = ({ children }: { children: React.ReactNode }) => {
  const listenersRef = useRef(new Map<string, Set<(data: unknown) => void>>());

  const addListener = (eventType: string, callback: (data: unknown) => void) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
    }
    listenersRef.current.get(eventType)!.add(callback);

    return () => {
      const listeners = listenersRef.current.get(eventType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          listenersRef.current.delete(eventType);
        }
      }
    };
  };

  const emit = (eventType: string, data: unknown) => {
    const listeners = listenersRef.current.get(eventType);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  };

  return (
    <RealTimeContext.Provider value={{ addListener, emit }}>
      {children}
    </RealTimeContext.Provider>
  );
};

export const useRelationshipChanges = (callback: (data: unknown) => void) => {
  const { addListener } = useRealTime();
  React.useEffect(() => {
    const cleanup = addListener("relationship_change", callback);
    return cleanup;
  }, [callback, addListener]);
};

export const useBlockedUserChanges = (callback: (data: unknown) => void) => {
  const { addListener } = useRealTime();
  React.useEffect(() => {
    const cleanupBlocked = addListener("blocked_user_change", callback);
    const cleanupBlockedBy = addListener("blocked_by_change", callback);
    return () => {
      cleanupBlocked();
      cleanupBlockedBy();
    };
  }, [callback, addListener]);
};

export const useProfileUpdates = (callback: (data: unknown) => void) => {
  const { addListener } = useRealTime();
  React.useEffect(() => {
    const cleanup = addListener("profile_update", callback);
    return cleanup;
  }, [callback, addListener]);
};
