// ⬇️ BLOCCO 12 — /src/lib/orchestrator/learn.ts
// ANOVA_ORCHESTRATOR_V42

import type { Domain, PerformanceSample, ProviderId } from "./types";
// ⚠️ Assumi che tu abbia già un helper Firestore lato server:
//    import { db } from "@/lib/firebase/server";  // <--- crea questo se non esiste
//    import { collection, addDoc } from "firebase/firestore"; // SDK compatibile server

// EMA = Exponential Moving Average
export function ema(prev: number | undefined, sample: number, alpha = 0.2): number {
  if (prev == null) return sample;
  return alpha * sample + (1 - alpha) * prev;
}

export async function logPerformance(sample: PerformanceSample) {
  try {
    // Esempio di persistenza (commentato per non rompere build se manca db):
    // await addDoc(collection(db, "ai_performance"), sample);
  } catch {
    // silenzioso in v4.2
  }
}

export async function updateAggregates(
  provider: ProviderId,
  domain: Domain,
  score: number
) {
  // v4.2: placeholder. v4.3: leggi aggregato corrente e applica EMA.
}
// ⬆️ FINE BLOCCO 12
