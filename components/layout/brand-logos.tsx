import Image from "next/image";
import { cn } from "@/lib/utils";

// Logos de Cátedras Telefónica y de la Universidad de Sevilla (public/brand). Van sobre una
// pastilla blanca en los dos temas: el de Cátedras Telefónica tiene el texto oscuro y se
// perdería sobre un fondo oscuro, y un logo no se recolorea. `unoptimized` porque son dos PNG
// pequeños y así no hace falta el optimizador de imágenes (el proyecto arranca sin red).
// Para quitarlos: borra este archivo, la carpeta public/brand y sus dos usos (cabecera y portada).

const SIZES = {
  sm: { catedras: "h-6", university: "h-8" },
  md: { catedras: "h-7", university: "h-11" },
} as const;

export function BrandLogos({
  className,
  size = "sm",
}: {
  className?: string;
  size?: keyof typeof SIZES;
}) {
  return (
    <div
      role="group"
      aria-label="Cátedras Telefónica y Universidad de Sevilla"
      className={cn(
        "flex items-center gap-3 rounded-lg bg-white px-3 py-1.5 ring-1 ring-black/10",
        className,
      )}
    >
      <Image
        src="/brand/catedras-telefonica.png"
        alt="Cátedras Telefónica"
        width={1366}
        height={240}
        unoptimized
        className={cn("w-auto", SIZES[size].catedras)}
      />
      <span aria-hidden="true" className="h-6 w-px bg-black/15" />
      <Image
        src="/brand/universidad-de-sevilla.png"
        alt="Universidad de Sevilla"
        width={320}
        height={320}
        unoptimized
        className={cn("w-auto", SIZES[size].university)}
      />
    </div>
  );
}
