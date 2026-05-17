import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4">
      <h1 className="text-3xl font-semibold mb-4">
        SW Mejor Niñez
      </h1>
      <p className="text-muted-foreground mb-8 text-center max-w-md">
        Sistema de gestión para el programa de protección de niños, niñas y adolescentes.
      </p>
      <Button asChild>
        <Link href="/nna">Ver registro NNA</Link>
      </Button>
    </div>
  );
}
