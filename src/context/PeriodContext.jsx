import React, { createContext, useContext, useMemo, useState } from "react";

const PeriodContext = createContext(null);

export function PeriodProvider({ children }) {
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1..12

  // ✅ moeda global (para vender para outros países)
  const [currency, setCurrency] = useState("EUR"); // "USD", "GBP", etc.

  const value = useMemo(
    () => ({ year, month, setYear, setMonth, currency, setCurrency }),
    [year, month, currency]
  );

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
}

export function usePeriod() {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod must be used within PeriodProvider");
  return ctx;
}

