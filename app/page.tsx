import Link from "next/link";
import { AppShell, FloatingCard } from "@/components/ui/design-system";

export default function Home() {
  return (
    <AppShell
      title="Tu espacio de entrenamiento"
      kicker=""
      subtitle="Acá podrás planificar entrenamientos, clases y progreso."
    >
      <FloatingCard
        title=""
        description="Gestiona rutinas de fuerza, movilidad, yoga y meditación desde un ecosistema unico."
      >
        <Link href="/login" className="ds-btn-primary ds-btn-full">
          Entrar a Práctica viva
        </Link>
      </FloatingCard>
    </AppShell>
  );
}
