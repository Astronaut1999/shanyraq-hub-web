import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

interface PreferencesValue {
  lowBandwidth: boolean;
  setLowBandwidth: (value: boolean) => void;
  online: boolean;
  /** Feed page size — smaller when saving traffic. */
  pageSize: number;
}

const PreferencesContext = createContext<PreferencesValue>({
  lowBandwidth: false,
  setLowBandwidth: () => {},
  online: true,
  pageSize: 12,
});

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [lowBandwidth, setLowBandwidthState] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string; addEventListener?: (type: string, listener: () => void) => void; removeEventListener?: (type: string, listener: () => void) => void } }).connection;
    const syncConnection = () => setLowBandwidthState(Boolean(connection?.saveData || connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g"));
    syncConnection();
    setOnline(navigator.onLine);

    const goOffline = () => {
      setOnline(false);
      toast.error("Интернет байланысы жоқ");
    };
    const goOnline = () => {
      setOnline(true);
      toast.success("Байланыс қалпына келді");
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    connection?.addEventListener?.("change", syncConnection);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      connection?.removeEventListener?.("change", syncConnection);
    };
  }, []);

  const value = useMemo<PreferencesValue>(
    () => ({
      lowBandwidth,
      online,
      pageSize: lowBandwidth ? 6 : 12,
      setLowBandwidth: (next: boolean) => {
        setLowBandwidthState(next);
      },
    }),
    [lowBandwidth, online],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
