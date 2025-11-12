// ⬇️ BLOCCO 11 — /src/lib/orchestrator/fusion.ts
// ANOVA_ORCHESTRATOR_V42

import type { FusionResult, ProviderResponse } from "./types";

function heuristicScore(text: string): number {
  // Heuristica semplice: lunghezza utile + presenza di elenco + punteggiatura
  if (!text) return 0;
  const len = Math.min(text.length, 4000) / 4000;
  const bullets = (text.match(/[-•]/g) || []).length;
  const commas = (text.match(/[,.;:]/g) || []).length;
  const structure = Math.min((bullets + commas) / 30, 0.4);
  return Math.max(0.05, Math.min(1, 0.5 * len + structure));
}

export function fuse(responses: ProviderResponse[]): FusionResult {
  const scored = responses.map((r) => ({
    ...r,
    _score: r.success ? heuristicScore(r.text) : 0,
  }));

  const used = scored
    .filter((r) => r._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 3);

  // Fusione base: prendiamo il migliore come spina dorsale, aggiungiamo sintesi dagli altri
  const spine = used[0]?.text ?? "";
  const additives = used.slice(1).map((u) => u.text).filter(Boolean);
  const finalText =
    additives.length > 0
      ? `${spine}\n\n—\nIntegrazioni utili:\n${additives.map((t) => `• ${t}`).join("\n")}`
      : spine;

  const fusionScore =
    used.length === 0 ? 0 : Math.min(1, used.reduce((acc, u) => acc + u._score, 0) / used.length);

  return {
    finalText: finalText || "Nessuna risposta utile dai provider.",
    fusionScore,
    used: used.map((u) => ({ provider: u.provider, score: u._score, latencyMs: u.latencyMs })),
  };
}
// ⬆️ FINE BLOCCO 11
