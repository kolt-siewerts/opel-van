import { useState, useCallback } from "react";
import en from "../locales/en.json";
import de from "../locales/de.json";

export type Locale = "en" | "de";

type Translations = typeof en;

const translations: Record<Locale, Translations> = {
  en,
  de,
};

function getNestedValue(obj: unknown, path: string): string {
  const keys = path.split(".");
  let result: unknown = obj;
  for (const key of keys) {
    if (result && typeof result === "object" && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }
  return typeof result === "string" ? result : path;
}

export function useI18n(initialLocale: Locale = "en") {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  const t = useCallback(
    (key: string): string => {
      return getNestedValue(translations[locale], key);
    },
    [locale]
  );

  const changeLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
  }, []);

  return { t, locale, changeLocale };
}
