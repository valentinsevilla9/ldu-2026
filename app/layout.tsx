import type { Metadata } from "next";
import { MainNav } from "@/components/layout/main-nav";
import { SiteHeader } from "@/components/layout/site-header";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/site";
import "./globals.css";

// Fuente del sistema en lugar de next/font/google: así el proyecto arranca sin red.
export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: next-themes añade la clase del tema antes de hidratar.
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <a
            href="#main"
            className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
          >
            Saltar al contenido
          </a>
          <SiteHeader />
          <div className="flex flex-1">
            <aside className="hidden w-60 shrink-0 border-r bg-sidebar p-4 text-sidebar-foreground md:block">
              <MainNav />
            </aside>
            <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 py-8 sm:px-8">
              <div className="mx-auto w-full max-w-5xl">{children}</div>
            </main>
          </div>
          <Toaster richColors closeButton containerAriaLabel="Notificaciones" />
        </ThemeProvider>
      </body>
    </html>
  );
}
