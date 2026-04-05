"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

function getCookie(name: string) {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : undefined;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}`;
}

export default function LanguageToggle() {
  const [lang, setLang] = useState<"es" | "en">("es");

  useEffect(() => {
    const c = getCookie("lang") || "es";
    setLang(c === "en" ? "en" : "es");
  }, []);

  function change(l: "es" | "en") {
    setCookie("lang", l);
    setLang(l);
    // reload so server components can pick up cookie
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant={lang === "es" ? "primary" : "ghost"} size="sm" onClick={() => change("es")}>
        ES
      </Button>
      <Button variant={lang === "en" ? "primary" : "ghost"} size="sm" onClick={() => change("en")}>
        EN
      </Button>
    </div>
  );
}
