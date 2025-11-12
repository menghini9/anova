// ⬇️ BLOCCO 8 — /src/lib/orchestrator/providers/llama.ts
// ANOVA_ORCHESTRATOR_V42

import { withTimeout } from "./_base";
import type { ProviderResponse } from "../types";
import { PROVIDER_TIMEOUT_MS } from "../policy";

export async function invokeLlama(prompt: string): Promise<ProviderResponse> {
  const t0 = Date.now();
  try {
    const key = process.env.LLAMA_API_KEY;
    if (!key) throw new Error("LLAMA_API_KEY missing");

    // Esempio: Together/Groq — adatta l’URL al tuo provider
    const r = await withTimeout(
      fetch("https://api.together.xyz/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        }),
      }).then((res) => res.json()),
      PROVIDER_TIMEOUT_MS
    );

    const text = r?.choices?.[0]?.message?.content ?? "";
    return {
      provider: "llama",
      text,
      latencyMs: Date.now() - t0,
      success: Boolean(text),
      error: text ? undefined : "empty_response",
    };
  } catch (e: any) {
    return {
      provider: "llama",
      text: "",
      latencyMs: Date.now() - t0,
      success: false,
      error: e?.message ?? "unknown",
    };
  }
}
// ⬆️ FINE BLOCCO 8
