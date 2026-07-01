// Contrato común de las pantallas de /v2. El shell (index.tsx) pasa estas props
// a la pantalla activa. Cada pantalla hace sus propios fetches con `tenantId`.
export interface ScreenProps {
  tenantId: string | null;
  tenantName: string;
  date: string; // ISO YYYY-MM-DD (día seleccionado en el header)
  onOpenAI: () => void;
  goTo: (section: SectionKey) => void; // navegar a otra sección del shell
  newApptSignal?: number; // el shell lo incrementa al pulsar "Nueva atención" (abre el modal de cita)
}

export type SectionKey = "op" | "crm" | "inv" | "nomina" | "config";
