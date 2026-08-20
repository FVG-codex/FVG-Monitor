import type { ReactNode } from "react";

export function Panel({
  title,
  linkLabel,
  linkHref,
  span,
  children,
}: {
  title: string;
  linkLabel?: string;
  linkHref?: string;
  span?: 2 | 3;
  children: ReactNode;
}) {
  const spanClass = span === 2 ? "md:col-span-2" : span === 3 ? "md:col-span-3" : "";

  return (
    <div className={`bg-panel p-5 ${spanClass}`}>
      <div className="flex items-center justify-between mb-3.5">
        <span className="font-cond font-semibold text-[13px] tracking-[0.09em] uppercase text-ink-dim">
          {title}
        </span>
        {linkLabel && linkHref && (
          <a
            href={linkHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-ink-faint hover:text-cool transition-colors"
          >
            {linkLabel}
          </a>
        )}
      </div>
      {children}
    </div>
  );
}
