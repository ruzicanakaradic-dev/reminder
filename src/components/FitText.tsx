"use client";

import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

// Smanjuje font dok ceo tekst (npr. „1.234.567 RSD") ne stane u jedan red.
// Meri širinu teksta u odnosu na širinu kontejnera i spušta font do `min`.
export function FitText({
  children,
  max,
  min = 12,
  className,
}: {
  children: ReactNode;
  max: number;
  min?: number;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const span = spanRef.current;
    if (!box || !span) return;

    const fit = () => {
      let size = max;
      span.style.fontSize = `${size}px`;
      // -1px rezerva da zaokruživanje ne gurne tekst u prelom na granici
      while (size > min && span.scrollWidth > box.clientWidth - 1) {
        size -= 0.5;
        span.style.fontSize = `${size}px`;
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [children, max, min]);

  return (
    <div ref={boxRef} className={className} style={{ minWidth: 0 }}>
      <span ref={spanRef} style={{ display: "inline-block", whiteSpace: "nowrap", fontSize: max }}>
        {children}
      </span>
    </div>
  );
}
