import { Link } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { FilePlus2, Users, ShieldCheck } from "lucide-react";

// 1. Aprovechamos el array para mapear los botones y añadimos iconos
const routes: Array<{ name: string; href: string; icon: typeof FilePlus2; variant: "default" | "outline" }> = [
  { 
    name: "Nuevo caso", 
    href: "/nuevo-caso", 
    icon: FilePlus2, 
    variant: "default" 
  },
  { 
    name: "Ver registro NNA", 
    href: "/nna", 
    icon: Users, 
    variant: "outline" 
  },
];

export default function Home() {
  return (
    // 2. Fondo con sutil patrón de puntos y gradiente para dar profundidad
    <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-12 overflow-hidden">
      <div
        className="absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(#000000 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
      
      <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
        
        {/* 3. Ícono/Logo de marca */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 mb-6">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>

        {/* 4. Etiqueta superior (Badge) */}
        {/* <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground mb-5">
          Plataforma de Gestión Integral
        </span> */}

        {/* 5. Tipografía mejorada */}
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          SW Mejor Niñez
        </h1>
        
        <p className="text-muted-foreground mb-10 text-lg max-w-md">
          Sistema de gestión para el programa de protección de niños, niñas y adolescentes.
        </p>

        {/* 6. Botones más grandes, responsive y generados dinámicamente */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {routes.map((route) => (
            <Button 
              key={route.href} 
              asChild 
              size="lg" 
              variant={route.variant}
              className="w-full sm:w-auto h-12 text-base shadow-sm hover:shadow-md transition-all"
            >
              <Link href={route.href}>
                <route.icon className="mr-2 h-5 w-5" />
                {route.name}
              </Link>
            </Button>
          ))}
        </div>

        {/* 7. Enlace de ayuda secundario al pie */}
        {/* <Link 
          href="/ayuda" 
          className="mt-10 text-sm text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
        >
          ¿Necesitas ayuda para usar el sistema?
        </Link> */}

      </div>
    </main>
  );
}