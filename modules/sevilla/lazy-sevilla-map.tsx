"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const SevillaMap = dynamic(() => import("./sevilla-map").then((module) => module.SevillaMap), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full" />,
});

/**
 * El mapa de Sevilla para páginas largas (como /idea): ni su código ni sus datos se descargan
 * hasta que el mapa está a punto de verse, así la página carga igual de rápido que sin él.
 */
export function LazySevillaMap(props: ComponentProps<typeof SevillaMap>) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible || !ref.current) return;
    // Without IntersectionObserver (very old browsers, test environments), just load it.
    if (typeof IntersectionObserver === "undefined") {
      const timer = setTimeout(() => setVisible(true), 0);
      return () => clearTimeout(timer);
    }
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { rootMargin: "200px" },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref}>
      {visible ? <SevillaMap {...props} /> : <Skeleton className="h-96 w-full" />}
    </div>
  );
}
