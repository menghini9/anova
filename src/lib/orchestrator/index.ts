// ⬇️ BLOCCO 13 — /src/lib/orchestrator/index.ts
// ANOVA_ORCHESTRATOR_V42

import type { Intent, FusionResult, ProviderResponse } from "./types";
import { fanout } from "./router";
import { fuse } from "./fusion";
import { logPerformance } from "./learn";

export function analyzeIntent(prompt: string, userId?: string): Intent {
  // Intent Analyzer minimale (rule-based) — v4.2
  const lower = prompt.toLowerCase();
  const codeHints = ["code", "typescript", "javascript", "bug", "function", "api", "firebase"];
  const factualHints = ["fonte", "citazione", "data", "numero", "prezzo", "legge"];
  const creativeHints = ["poesia", "stile", "narrazione", "metafora"];
  const strategyHints = ["strategia", "piano", "roadmap", "kpi", "go-to-market", "pricing"];

  const has = (arr: string[]) => arr.some((k) => lower.includes(k));

  let purpose: Intent["purpose"] = "logic";
  if (has(codeHints)) purpose = "code";
  else if (has(factualHints)) purpose = "factual";
  else if (has(creativeHints)) purpose = "creative";
  else if (has(strategyHints)) purpose = "strategy";

  const complexity: Intent["complexity"] =
    lower.length > 600 ? "high" : lower.length > 200 ? "medium" : "low";

  return {
    purpose,
    tone: "neutral",
    complexity,
    keywords: [],
    original: prompt,
    userId,
  };
}

export async function getAIResponse(prompt: string, userId?: string): Promise<{
  fusion: FusionResult;
  raw: ProviderResponse[];
}> {
  const intent = analyzeIntent(prompt, userId);
  const raw = await fanout(intent);
  // log minimo performance (solo success)
  await Promise.all(
    raw
      .filter((r) => r.success)
      .map((r) =>
        logPerformance({
          provider: r.provider,
          domain: intent.purpose,
          score: Math.min(1, Math.max(0, r.text.length / 2000)),
          latencyMs: r.latencyMs,
          ts: Date.now(),
        })
      )
  );
  const fusion = fuse(raw);
  return { fusion, raw };
}
// ⬆️ FINE BLOCCO 13
