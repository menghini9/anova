// ⬇️ BLOCCO 9 — /src/lib/orchestrator/providers/web.ts
// ANOVA_ORCHESTRATOR_V42

import { withTimeout } from "./_base";
import type { ProviderResponse } from "../types";
import { PROVIDER_TIMEOUT_MS } from "../policy";

export async function invokeWeb(prompt: string): Promise<ProviderResponse> {
  const t0 = Date.now();
  try {
    const key = process.env.TAVILY_API_KEY;
    if (!key) throw new Error("TAVILY_API_KEY missing");

    const r = await withTimeout(
      fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          query: prompt,
          max_results: 5,
          include_answer: true,
        }),
      }).then((res) => res.json()),
      PROVIDER_TIMEOUT_MS
    );

    const text = r?.answer || (r?.results || []).map((x: any) => `• ${x.title}: ${x.url}`).join("\n");
    return {
      provider: "web",
      text: text || "",
      latencyMs: Date.now() - t0,
      success: Boolean(text),
      error: text ? undefined : "empty_response",
    };
  } catch (e: any) {
    return {
      provider: "web",
      text: "",
      latencyMs: Date.now() - t0,
      success: false,
      error: e?.message ?? "unknown",
    };
  }
}
// ⬆️ FINE BLOCCO 9
