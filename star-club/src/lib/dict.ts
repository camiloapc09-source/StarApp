import es from "@/locales/es.json";
import en from "@/locales/en.json";
import { cookies } from "next/headers";

type Dict = typeof es;

export async function getDictionary(): Promise<Dict> {
  try {
    const cookieStore = await cookies();
    const lang = cookieStore.get("lang")?.value ?? "es";
    return lang === "en" ? (en as Dict) : (es as Dict);
  } catch (e) {
    return es as Dict;
  }
}

export default getDictionary;
