import flagspain from "../assets/images/flags/spain.svg";
import flagus from "../assets/images/flags/us.svg";

const languages: Record<string, { label: string; flag: string; currency: string }> = {
  sp: { label: "Español", flag: flagspain, currency: "COP" },
  en: { label: "English", flag: flagus, currency: "USD" },
};

export default languages;
