"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MenuHamburger } from "@/components/MenuHamburger";
import { PROVINCE_LIST } from "@/lib/province";

export function TopHeader({ paginaAttiva }: { paginaAttiva?: "regione" | string }) {
  const [ora, setOra] = useState<string>("");
  const [data, setData] = useState<string>("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      setOra(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
      setData(
        now.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const voci = [{ label: "Tutta la regione", href: "/", key: "regione" }, ...PROVINCE_LIST.map((p) => ({ label: p.nome, href: `/${p.slug}`, key: p.slug }))];

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
      <div className="max-w-[1180px] mx-auto px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <MenuHamburger />
          <Link href="/" className="font-cond font-bold text-[22px] tracking-[0.06em] uppercase flex items-baseline gap-2">
            <span className="w-[7px] h-[7px] rounded-full bg-cool inline-block pulse-dot" />
            FVG Monitor
          </Link>
        </div>

        <nav aria-label="Navigazione per provincia" className="flex gap-0.5 font-cond font-semibold text-sm flex-wrap">
          {voci.map((voce) => (
            <Link
              key={voce.key}
              href={voce.href}
              aria-current={voce.key === paginaAttiva ? "page" : undefined}
              className={`px-3 py-1.5 rounded border transition-colors ${
                voce.key === paginaAttiva
                  ? "bg-cool border-cool text-bg"
                  : "border-line text-ink-dim hover:text-ink hover:border-ink-faint"
              }`}
            >
              {voce.label}
            </Link>
          ))}
        </nav>

        <div className="font-mono text-right leading-relaxed">
          <div className="text-[13px] text-ink-dim">{ora}</div>
          <div className="text-xs text-ink-faint">{data}</div>
        </div>
      </div>
    </header>
  );
}
