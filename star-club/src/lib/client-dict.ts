import es from "@/locales/es.json";
import en from "@/locales/en.json";

type Dict = typeof es;

export function getClientDictionary(): Dict {
  try {
    if (typeof document === "undefined") return es as Dict;
    const match = document.cookie.match(/(^| )lang=([^;]+)/);
    const lang = match ? decodeURIComponent(match[2]) : "es";
    return lang === "en" ? (en as Dict) : (es as Dict);
  } catch (e) {
    return es as Dict;
  }
}

export default getClientDictionary;
