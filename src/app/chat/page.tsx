// ⬇️ BLOCCO 5 — ChatPage con simulazione AI locale
"use client";

import { useState } from "react";

interface Message {
  sender: "user" | "anova";
  text: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  // ⚙️ Funzione per gestire invio messaggi
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    // Aggiunge messaggio utente
    const newUserMessage: Message = { sender: "user", text: trimmed };
    setMessages((prev) => [...prev, newUserMessage]);
    setInput("");

    // Simula risposta AI con leggero ritardo
    setTimeout(() => {
      const simulatedResponse: Message = {
        sender: "anova",
        text: generateLocalResponse(trimmed),
      };
      setMessages((prev) => [...prev, simulatedResponse]);
    }, 600);
  };

  // 💡 Simulatore di risposta locale
  const generateLocalResponse = (prompt: string) => {
    const lower = prompt.toLowerCase();

    if (lower.includes("ciao")) return "Ciao Luca. Sono pronta per lavorare.";
    if (lower.includes("test") || lower.includes("prova"))
      return "Test eseguito correttamente. Sistema stabile.";
    if (lower.includes("chi sei"))
      return "Sono Anova β, il ponte fra la tua mente e le intelligenze artificiali.";
    return "Ricevuto. Elaboro il contesto interno e preparo una risposta.";
  };

  return (
    <main className="h-screen w-screen flex flex-col bg-neutral-950 text-neutral-100">
      {/* 🔹 HEADER */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-neutral-800">
        <h2 className="text-xl font-semibold">
          Anova<span className="text-neutral-500"> β</span> — Chat
        </h2>
        <div className="text-sm text-neutral-400">Simulazione locale</div>
      </header>

      {/* 🔹 AREA MESSAGGI */}
      <section className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-neutral-600 text-center">
            Nessun messaggio. Inizia a dialogare con Anova β.
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`max-w-2xl mx-auto rounded-xl p-4 ${
                msg.sender === "user"
                  ? "bg-neutral-900 border border-neutral-700 text-right"
                  : "bg-neutral-800 border border-neutral-700 text-left"
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.text}</p>
            </div>
          ))
        )}
      </section>

      {/* 🔹 INPUT */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-3 border-t border-neutral-800 px-6 py-4 bg-neutral-950"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Scrivi un messaggio..."
          className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white"
        />
        <button
          type="submit"
          className="bg-white text-black font-medium px-5 py-2 rounded-lg hover:bg-neutral-200 transition"
        >
          Invia
        </button>
      </form>
    </main>
  );
}
// ⬆️ FINE BLOCCO 5
