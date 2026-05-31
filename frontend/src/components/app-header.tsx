"use client";

import { useState } from "react";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getUser, isAuthenticated, logout, type AuthUser } from "@/lib/auth";

function getInitialUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  if (!isAuthenticated()) return null;
  return getUser();
}

export function AppHeader() {
  const [user] = useState<AuthUser | null>(getInitialUser);

  if (!user) {
    return (
      <header className="border-b bg-background">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <span className="text-sm font-semibold">SW Mejor Niñez</span>
          <ThemeToggle />
        </div>
      </header>
    );
  }

  return (
    <header className="border-b bg-background">
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink href="/" className="text-sm font-semibold">
                SW Mejor Niñez
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                href="/nuevo-caso"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                + Nuevo caso
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                href="/nna"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                NNA
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                href="/familiar"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Familiares
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{user.nombre || user.email}</span>
          <Button variant="ghost" size="sm" onClick={logout}>
            Cerrar sesión
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
