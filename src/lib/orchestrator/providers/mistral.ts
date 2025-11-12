// ⬇️ BLOCCO 7 — /src/lib/orchestrator/providers/mistral.ts
// ANOVA_ORCHESTRATOR_V42

import { withTimeout } from "./_base";
import type { ProviderResponse } from "../types";
import { PROVIDER_TIMEOUT_MS } from "../policy";

export async function invokeMistral(prompt: string): Promise<ProviderResponse> {
  const t0 = Date.now();
  try {
    const key = process.env.MISTRAL_API_KEY;
    if (!key) throw new Error("MISTRAL_API_KEY missing");

    const r = await withTimeout(
      fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "mistral-large-latest",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        }),
      }).then((res) => res.json()),
      PROVIDER_TIMEOUT_MS
    );

    const text = r?.choices?.[0]?.message?.content ?? "";
    return {
      provider: "mistral",
      text,
      latencyMs: Date.now() - t0,
      success: Boolean(text),
      error: text ? undefined : "empty_response",
    };
  } catch (e: any) {
    return {
      provider: "mistral",
      text: "",
      latencyMs: Date.now() - t0,
      success: false,
      error: e?.message ?? "unknown",
    };
  }
}
// ⬆️ FINE BLOCCO 7
