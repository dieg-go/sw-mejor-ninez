import type { Metadata } from "next";
// Fuentes self-hosted (paquetes @fontsource-variable, OFL-1.1). Se importa el
// CSS completo, que declara cada subset con `unicode-range`: el navegador solo
// descarga el woff2 que necesita (el latino), asi que no hay requests a Google.
// Antes venian de `next/font/google`; se quitaron para que el router adapter
// (`@/lib/navigation`) sea el unico acoplamiento a Next que queda en la UI.
import "@fontsource-variable/inter";
import "@fontsource-variable/sora";
import "@fontsource-variable/geist-mono";
import { AppHeader } from "@/components/app-header";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "SW Mejor Niñez",
  description: "Sistema de gestión para el programa Mejor Niñez",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <html lang="es" suppressHydrationWarning className="h-full antialiased font-sans">
        <head />
        <body className="min-h-full flex flex-col">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <AppHeader />
              <main className="flex-1">{children}</main>
            </AuthProvider>
          </ThemeProvider>
        </body>
      </html>
    </>
  );
}
