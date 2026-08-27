import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Sora } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const sora = Sora({ subsets: ["latin"], variable: "--font-heading" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <html
        lang="es"
        suppressHydrationWarning
        className={cn(
          "h-full",
          "antialiased",
          geistSans.variable,
          geistMono.variable,
          "font-sans",
          inter.variable,
          sora.variable,
        )}
      >
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
