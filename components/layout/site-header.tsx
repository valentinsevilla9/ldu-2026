"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { APP_NAME } from "@/lib/site";
import { BrandLogos } from "./brand-logos";
import { MainNav } from "./main-nav";
import { ThemeToggle } from "./theme-toggle";

// Cabecera: en móvil, la navegación vive en un panel lateral (Sheet) que atrapa
// el foco mientras está abierto y lo devuelve al botón al cerrarse.
/** `actions`: extra controls next to the theme toggle (e.g. a simulated "view as" switch). */
export function SiteHeader({ actions }: { actions?: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <MenuIcon aria-hidden="true" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-4">
          <SheetHeader className="p-0">
            <SheetTitle>{APP_NAME}</SheetTitle>
            <SheetDescription className="sr-only">Navegación principal</SheetDescription>
          </SheetHeader>
          <MainNav onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <Link href="/" className="font-semibold tracking-tight">
        {APP_NAME}
      </Link>
      {/* No cabe en el móvil: allí salen en la portada. */}
      <BrandLogos className="ml-3 hidden md:flex" />

      <div className="ml-auto flex items-center gap-2">
        {actions}
        <ThemeToggle />
      </div>
    </header>
  );
}
