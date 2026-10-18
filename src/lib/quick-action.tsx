import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type QuickAction = "event" | "media" | "plan";

interface QuickActionValue {
  pending: QuickAction | null;
  request: (action: QuickAction) => void;
  consume: (action: QuickAction) => boolean;
}

const QuickActionContext = createContext<QuickActionValue>({
  pending: null,
  request: () => {},
  consume: () => false,
});

export function QuickActionProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<QuickAction | null>(null);

  const value = useMemo<QuickActionValue>(
    () => ({
      pending,
      request: (action) => setPending(action),
      consume: (action) => {
        if (pending !== action) return false;
        setPending(null);
        return true;
      },
    }),
    [pending],
  );

  return <QuickActionContext.Provider value={value}>{children}</QuickActionContext.Provider>;
}

export function useQuickAction() {
  return useContext(QuickActionContext);
}
