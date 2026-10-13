import { HomeIcon, SmartphoneIcon, ListChecksIcon, type LucideIcon } from "lucide-react";
export type NavItem = { href: string; label: string; icon: LucideIcon };
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: HomeIcon },
  { href: "/app", label: "App", icon: SmartphoneIcon },
  { href: "/gestion", label: "Gestión", icon: ListChecksIcon },
];
export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
