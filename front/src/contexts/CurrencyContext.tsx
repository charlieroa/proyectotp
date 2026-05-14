import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

type CurrencyType = "COP" | "USD";

interface CurrencyContextType {
  currency: CurrencyType;
  setCurrency: (currency: CurrencyType) => void;
  exchangeRate: number | null;
  formatCurrency: (amountCOP: number) => string;
  formatFromUSD: (amountUSD: number) => string;
  convertAmount: (amountCOP: number) => number;
}

const STORAGE_KEY = "APP_CURRENCY";
const RATE_STORAGE_KEY = "APP_EXCHANGE_RATE";
const RATE_TIMESTAMP_KEY = "APP_EXCHANGE_RATE_TS";
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
const FALLBACK_RATE = 4200; // Fallback COP/USD rate if API fails

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyType>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "USD" ? "USD" : "COP";
  });

  const [exchangeRate, setExchangeRate] = useState<number | null>(() => {
    const cached = localStorage.getItem(RATE_STORAGE_KEY);
    const ts = localStorage.getItem(RATE_TIMESTAMP_KEY);
    if (cached && ts && Date.now() - Number(ts) < CACHE_DURATION_MS) {
      return Number(cached);
    }
    return null;
  });

  const setCurrency = useCallback((value: CurrencyType) => {
    setCurrencyState(value);
    localStorage.setItem(STORAGE_KEY, value);
  }, []);

  useEffect(() => {
    const fetchRate = async () => {
      const ts = localStorage.getItem(RATE_TIMESTAMP_KEY);
      const cached = localStorage.getItem(RATE_STORAGE_KEY);
      if (cached && ts && Date.now() - Number(ts) < CACHE_DURATION_MS) {
        setExchangeRate(Number(cached));
        return;
      }
      try {
        const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
        const data = await res.json();
        const rate = data.rates?.COP;
        if (rate) {
          setExchangeRate(rate);
          localStorage.setItem(RATE_STORAGE_KEY, String(rate));
          localStorage.setItem(RATE_TIMESTAMP_KEY, String(Date.now()));
        }
      } catch (err) {
        console.error("Failed to fetch exchange rate, using fallback:", err);
        setExchangeRate(FALLBACK_RATE);
      }
    };
    fetchRate();
  }, []);

  const effectiveRate = exchangeRate || FALLBACK_RATE;

  const convertAmount = useCallback(
    (amountCOP: number): number => {
      return amountCOP / effectiveRate;
    },
    [effectiveRate]
  );

  const formatCurrency = useCallback(
    (amountCOP: number): string => {
      if (currency === "COP") {
        return copFormatter.format(amountCOP);
      }
      const usdAmount = convertAmount(amountCOP);
      return usdFormatter.format(usdAmount);
    },
    [currency, convertAmount]
  );

  const formatFromUSD = useCallback(
    (amountUSD: number): string => {
      if (currency === "USD") {
        return usdFormatter.format(amountUSD);
      }
      const copAmount = amountUSD * effectiveRate;
      return copFormatter.format(copAmount);
    },
    [currency, effectiveRate]
  );

  const value = useMemo<CurrencyContextType>(
    () => ({ currency, setCurrency, exchangeRate, formatCurrency, formatFromUSD, convertAmount }),
    [currency, setCurrency, exchangeRate, formatCurrency, formatFromUSD, convertAmount]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
