import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import translationSP from "./locales/sp.json";
import translationENG from "./locales/en.json";

const resources = {
  sp: { translation: translationSP },
  en: { translation: translationENG },
};

// One-time migration: clear old language detector artifacts
const migrated = localStorage.getItem("I18N_V2");
if (!migrated) {
  localStorage.removeItem("i18nextLng");
  localStorage.setItem("I18N_LANGUAGE", "sp");
  localStorage.setItem("I18N_V2", "1");
}

const lng = localStorage.getItem("I18N_LANGUAGE") || "sp";

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng,
    fallbackLng: "sp",
    keySeparator: false,
    interpolation: { escapeValue: false },
  });

export default i18n;
