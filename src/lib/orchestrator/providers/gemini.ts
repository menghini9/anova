// ⬇️ BLOCCO 6 — /src/lib/orchestrator/providers/gemini.ts
// ANOVA_ORCHESTRATOR_V42

import { withTimeout } from "./_base";
import type { ProviderResponse } from "../types";
import { PROVIDER_TIMEOUT_MS } from "../policy";

export async function invokeGemini(prompt: string): Promise<ProviderResponse> {
  const t0 = Date.now();
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY missing");

    const r = await withTimeout(
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }).then((res) => res.json()),
      PROVIDER_TIMEOUT_MS
    );

    const text = r?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("\n") ?? "";

    return {
      provider: "gemini",
      text,
      latencyMs: Date.now() - t0,
      success: Boolean(text),
      error: text ? undefined : "empty_response",
    };
  } catch (e: any) {
    return {
      provider: "gemini",
      text: "",
      latencyMs: Date.now() - t0,
      success: false,
      error: e?.message ?? "unknown",
    };
  }
}
// ⬆️ FINE BLOCCO 6
