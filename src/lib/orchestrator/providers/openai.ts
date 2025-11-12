// ⬇️ BLOCCO 4 — /src/lib/orchestrator/providers/openai.ts
// ANOVA_ORCHESTRATOR_V42

import { withTimeout } from "./_base";
import type { ProviderResponse } from "../types";
import { PROVIDER_TIMEOUT_MS } from "../policy";

export async function invokeOpenAI(prompt: string): Promise<ProviderResponse> {
  const t0 = Date.now();
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY missing");

    // Minimal call (text-only). Adatta a gpt-4.1/gpt-5 quando disponibile.
    const r = await withTimeout(
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
        }),
      }).then((res) => res.json()),
      PROVIDER_TIMEOUT_MS
    );

    const text =
      r?.choices?.[0]?.message?.content ??
      r?.choices?.[0]?.text ??
      "";

    return {
      provider: "openai",
      text,
      latencyMs: Date.now() - t0,
      success: Boolean(text),
      error: text ? undefined : "empty_response",
    };
  } catch (e: any) {
    return {
      provider: "openai",
      text: "",
      latencyMs: Date.now() - t0,
      success: false,
      error: e?.message ?? "unknown",
    };
  }
}
// ⬆️ FINE BLOCCO 4
