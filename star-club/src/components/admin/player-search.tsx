"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Search } from "lucide-react";

export default function PlayerSearch({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const params = new URLSearchParams(searchParams.toString());
      const val = e.target.value.trim();
      if (val) {
        params.set("q", val);
      } else {
        params.delete("q");
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="relative w-full">
      <Search
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: "rgba(255,255,255,0.35)" }}
      />
      <input
        type="search"
        placeholder="Buscar por nombre, correo, documento o dorsal…"
        defaultValue={defaultValue}
        onChange={handleChange}
        className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.09)",
          color: "rgba(255,255,255,0.85)",
        }}
      />
    </div>
  );
}
