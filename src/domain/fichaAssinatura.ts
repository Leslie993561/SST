import type { BadgeTone } from "./exameStatus";
import type { FichaEntregaEpi } from "../types/domain";

export type StatusFichaEpi = "assinada" | "aguardando";

/**
 * 🟢 assinada — a via assinada já foi anexada pelo RH.
 * 🟡 aguardando — a ficha (PDF) foi gerada, falta anexar a via assinada.
 */
export function statusFichaEpi(ficha: FichaEntregaEpi): StatusFichaEpi {
  return ficha.assinaturaStoragePath ? "assinada" : "aguardando";
}

export function labelStatusFichaEpi(status: StatusFichaEpi): string {
  return status === "assinada" ? "Assinada" : "Aguardando assinatura";
}

export function toneStatusFichaEpi(status: StatusFichaEpi): BadgeTone {
  return status === "assinada" ? "success" : "warning";
}

/** Código sequencial da ficha exibido no PDF e na UI: EPIRH001, EPIRH002... */
export function codigoFichaEpi(numero: number): string {
  return `EPIRH${String(numero).padStart(3, "0")}`;
}
