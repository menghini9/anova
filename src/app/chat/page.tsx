"use client";
// ⬇️ BLOCCO 14.0 — ANOVA β Chat v4.0 (Definitiva + Cache Totale + Ottimizzazione I/O + Purge Auto)

import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =========================================================
   🧩 Tipi
   ========================================================= */
interface Message {
  id?: string;
  sender: "user" | "anova";
  text: string;
  createdAt?: any;
}

interface SessionMeta {
  id: string;
  title?: string | null;
  createdAt?: any;
  updatedAt?: any;
  lastMessage?: string | null;
  deleted?: boolean;
}

/* =========================================================
   💰 Piano Firestore stimato (Blaze)
   ========================================================= */
const PRICE_READS_PER_100K = 0.06;
const PRICE_WRITES_PER_100K = 0.18;

/* =========================================================
   🧮 Pannello Costi Firestore
   ========================================================= */
function CostPanel({
  totalReads,
  totalWrites,
  onReset,
}: {
  totalReads: number;
  totalWrites: number;
  onReset: () => void;
}) {
  const costReads = (totalReads / 100_000) * PRICE_READS_PER_100K;
  const costWrites = (totalWrites / 100_000) * PRICE_WRITES_PER_100K;
  const costTotal = costReads + costWrites;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <details className="bg-neutral-900/95 backdrop-blur border border-neutral-800 rounded-xl p-3 text-sm text-neutral-200 w-[320px]">
        <summary className="cursor-pointer select-none">💸 Costi Firestore (totali)</summary>
        <div className="mt-2 space-y-2">
          <div className="text-xs text-neutral-400">
            Stima cumulativa locale — non rappresenta la fatturazione reale.
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-2">
              <div className="text-[11px] text-neutral-500">Tot. letture</div>
              <div className="text-base">{totalReads.toLocaleString()}</div>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-2">
              <div className="text-[11px] text-neutral-500">Tot. scritture</div>
              <div className="text-base">{totalWrites.toLocaleString()}</div>
            </div>
          </div>
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-2">
            <div className="text-[11px] text-neutral-500">Costo stimato</div>
            <div className="text-base font-medium text-green-400">
              {costTotal.toLocaleString(undefined, {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 4,
              })}
            </div>
            <div className="text-[11px] text-neutral-500">
              (Letture: {costReads.toFixed(4)} • Scritture: {costWrites.toFixed(4)})
            </div>
          </div>
          <button
            onClick={onReset}
            className="mt-3 text-xs text-red-400 hover:text-red-300"
          >
            🔄 Azzera contatore locale
          </button>
        </div>
      </details>
    </div>
  );
}

/* =========================================================
   ⚡ Cache Totale
   ========================================================= */
type SessionCache = {
  [sid: string]: { messages: Message[]; title: string; ts: number };
};
const CACHE_TTL_MS = 60_000; // 1 minuto
const CACHE_PURGE_DAYS = 7; // elimina cache vecchie

/* =========================================================
   🧠 ChatPage
   ========================================================= */
export default function ChatPage() {
  // Stati UI
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState<string>("");
  const [editingTitle, setEditingTitle] = useState<boolean>(false);

  const [showArchive, setShowArchive] = useState(false);
  const [showTrash, setShowTrash] = useState(false);

  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [trashSessions, setTrashSessions] = useState<SessionMeta[]>([]);

  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>("");

  const [searchArchive, setSearchArchive] = useState("");
  const [searchTrash, setSearchTrash] = useState("");

  // Contatori persistenti
  const [totalReads, setTotalReads] = useState<number>(
    () => Number(localStorage.getItem("anovaTotalReads")) || 0
  );
  const [totalWrites, setTotalWrites] = useState<number>(
    () => Number(localStorage.getItem("anovaTotalWrites")) || 0
  );
  const incRead = (n = 1) => setTotalReads((v) => v + n);
  const incWrite = (n = 1) => setTotalWrites((v) => v + n);
  const resetCounters = () => {
    localStorage.removeItem("anovaTotalReads");
    localStorage.removeItem("anovaTotalWrites");
    setTotalReads(0);
    setTotalWrites(0);
  };

  // Persistenza automatica
  useEffect(() => {
    localStorage.setItem("anovaTotalReads", totalReads.toString());
  }, [totalReads]);
  useEffect(() => {
    localStorage.setItem("anovaTotalWrites", totalWrites.toString());
  }, [totalWrites]);

  // Cache in-memory
  const cacheRef = useRef<SessionCache>({});
  const activeMsgUnsubRef = useRef<null | (() => void)>(null);
  const activeTitleUnsubRef = useRef<null | (() => void)>(null);

  /* ---------------------------------------
     🧹 Auto-purge cache vecchie
     --------------------------------------- */
  useEffect(() => {
    const purge = () => {
      const cutoff = Date.now() - CACHE_PURGE_DAYS * 24 * 60 * 60 * 1000;
      Object.keys(localStorage)
        .filter((k) => k.startsWith("anovaMessages_"))
        .forEach((key) => {
          try {
            const data = JSON.parse(localStorage.getItem(key) || "{}");
            if (data.ts && data.ts < cutoff) localStorage.removeItem(key);
          } catch {}
        });
    };
    purge();
  }, []);

  /* ---------------------------------------
     ⚙️ Bootstrap sessione
     --------------------------------------- */
  useEffect(() => {
    let sid = localStorage.getItem("anovaSessionId");
    if (!sid) {
      sid = Date.now().toString();
      localStorage.setItem("anovaSessionId", sid);
    }
    setSessionId(sid);

    const sessRef = doc(db, "sessions", sid);
    setDoc(
      sessRef,
      {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: "Sessione avviata.",
        deleted: false,
      },
      { merge: true }
    ).then(() => incWrite());
  }, []);

  /* ---------------------------------------
     🗂️ Listener archivio/cestino (Low Read)
     --------------------------------------- */
  useEffect(() => {
    const sessionsRef = collection(db, "sessions");
    const qAll = query(sessionsRef, orderBy("updatedAt", "desc"), limit(100));

    const unsub = onSnapshot(qAll, (snap) => {
      const all: SessionMeta[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<SessionMeta, "id">),
      }));
      setSessions(all.filter((s) => !s.deleted));
      setTrashSessions(all.filter((s) => s.deleted));
      incRead(Math.max(1, snap.docChanges().length));
    });

    return () => unsub();
  }, []);

  /* ---------------------------------------
     📡 Gestione sessione attiva
     --------------------------------------- */
  useEffect(() => {
    if (!sessionId) return;

    // Cleanup listener precedente
    activeMsgUnsubRef.current?.();
    activeTitleUnsubRef.current?.();

    // Cache locale immediata
    const cached = localStorage.getItem(`anovaMessages_${sessionId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.messages) {
          setMessages(parsed.messages);
          setSessionTitle(parsed.title || "");
        }
      } catch {}
    }

    // Attacca listener messaggi
    const msgRef = collection(db, "sessions", sessionId, "messages");
    const qy = query(msgRef, orderBy("createdAt", "desc"), limit(50));
    const unsubMsg = onSnapshot(qy, (snap) => {
      const m: Message[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Message),
      }));
      setMessages(m.reverse());
      localStorage.setItem(
        `anovaMessages_${sessionId}`,
        JSON.stringify({ messages: m, title: sessionTitle, ts: Date.now() })
      );
      incRead(Math.max(1, snap.docChanges().length));
    });
    activeMsgUnsubRef.current = unsubMsg;

    // Attacca listener titolo
    const sessRef = doc(db, "sessions", sessionId);
    const unsubTitle = onSnapshot(sessRef, (snap) => {
      const t = snap.data()?.title || "";
      setSessionTitle(t);
      incRead();
    });
    activeTitleUnsubRef.current = unsubTitle;

    return () => {
      unsubMsg();
      unsubTitle();
    };
  }, [sessionId]);

  /* ---------------------------------------
     ➕ Nuova sessione
     --------------------------------------- */
  const handleNewSession = async () => {
    const newId = Date.now().toString();
    localStorage.setItem("anovaSessionId", newId);
    setSessionId(newId);

    const sessRef = doc(db, "sessions", newId);
    await setDoc(sessRef, {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: "Sessione avviata. Pronta per lavorare insieme.",
      deleted: false,
    });
    incWrite(2);

    await addDoc(collection(db, "sessions", newId, "messages"), {
      sender: "anova",
      text: "Sessione avviata. Pronta per lavorare insieme.",
      createdAt: serverTimestamp(),
    });
    incWrite();

    setMessages([]);
    setSessionTitle("");
    setToastMessage("✅ Nuova sessione avviata");
    setTimeout(() => setToastMessage(null), 1500);
  };

  /* ---------------------------------------
     ✏️ Rinomina
     --------------------------------------- */
  const commitActiveTitle = async () => {
    if (!sessionId) return;
    const clean = sessionTitle?.trim();
    await updateDoc(doc(db, "sessions", sessionId), {
      title: clean || null,
      updatedAt: serverTimestamp(),
    });
    incWrite();
    setEditingTitle(false);
    setToastMessage("✏️ Titolo aggiornato");
    setTimeout(() => setToastMessage(null), 1200);
  };

  const startInlineRename = (id: string, title?: string | null) => {
    setInlineEditId(id);
    setInlineEditValue((title || "").trim() || `#${id.slice(-6)}`);
  };

  const commitInlineRename = async (id: string) => {
    const value = inlineEditValue.trim();
    await updateDoc(doc(db, "sessions", id), {
      title: value || null,
      updatedAt: serverTimestamp(),
    });
    incWrite();
    setInlineEditId(null);
    setInlineEditValue("");
  };

  /* ---------------------------------------
     🗑️ Cestina / Ripristina / Apri
     --------------------------------------- */
  const handleOpenSession = (id: string) => {
    localStorage.setItem("anovaSessionId", id);
    setSessionId(id);
    setShowArchive(false);
    setShowTrash(false);
  };

  const handleDeleteSession = async (id: string) => {
    await updateDoc(doc(db, "sessions", id), {
      deleted: true,
      updatedAt: serverTimestamp(),
    });
    incWrite();
  };

  const handleRestoreSession = async (id: string) => {
    await updateDoc(doc(db, "sessions", id), {
      deleted: false,
      updatedAt: serverTimestamp(),
    });
    incWrite();
  };

  /* ---------------------------------------
     🧠 Risposta AI simulata
     --------------------------------------- */
  const generateLocalResponse = (prompt: string) => {
    const lower = prompt.toLowerCase();
    if (lower.includes("ciao")) return "Ciao Luca. Sono pronta per lavorare insieme in Anova β.";
    if (lower.includes("test") || lower.includes("prova")) return "Test completato con successo. Sistema stabile.";
    if (lower.includes("chi sei")) return "Sono Anova β — il tuo ambiente operativo cognitivo.";
    return "Ricevuto. Elaboro il contesto e preparo una risposta.";
  };

  /* ---------------------------------------
     💬 Invio messaggi
     --------------------------------------- */
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !sessionId) return;

    const messagesRef = collection(db, "sessions", sessionId, "messages");
    await addDoc(messagesRef, {
      sender: "user",
      text: trimmed,
      createdAt: serverTimestamp(),
    });
    incWrite(2);

    await updateDoc(doc(db, "sessions", sessionId), {
      updatedAt: serverTimestamp(),
      lastMessage: trimmed,
    });
    incWrite();

    setInput("");
    await new Promise((r) => setTimeout(r, 400));

    const aiResponse = generateLocalResponse(trimmed);
    await addDoc(messagesRef, {
      sender: "anova",
      text: aiResponse,
      createdAt: serverTimestamp(),
    });
    incWrite(2);

    await updateDoc(doc(db, "sessions", sessionId), {
      updatedAt: serverTimestamp(),
      lastMessage: aiResponse,
    });
    incWrite();
  };

  /* ---------------------------------------
     🔍 Filtri archivio / cestino
     --------------------------------------- */
  const filteredArchive = useMemo(() => {
    const t = searchArchive.toLowerCase();
    if (!t) return sessions;
    return sessions.filter(
      (s) =>
        (s.title || "").toLowerCase().includes(t) ||
        s.id.toLowerCase().includes(t) ||
        (s.lastMessage || "").toLowerCase().includes(t)
    );
  }, [sessions, searchArchive]);

  const filteredTrash = useMemo(() => {
    const t = searchTrash.toLowerCase();
    if (!t) return trashSessions;
    return trashSessions.filter(
      (s) =>
        (s.title || "").toLowerCase().includes(t) ||
        s.id.toLowerCase().includes(t) ||
        (s.lastMessage || "").toLowerCase().includes(t)
    );
  }, [trashSessions, searchTrash]);

  /* ---------------------------------------
     🧱 UI Completa
     --------------------------------------- */
  return (
    <main className="h-screen w-screen flex bg-black text-neutral-100 relative overflow-hidden">
      {/* Archivio */}
      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-neutral-950 border-r border-neutral-800 z-40 transition-transform duration-300 ${
          showArchive ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-4 flex items-center justify-between border-b border-neutral-800">
          <h3 className="text-base font-semibold">Archivio</h3>
          <button
            onClick={() => setShowArchive(false)}
            className="text-sm text-neutral-400 hover:text-white"
          >
            Chiudi
          </button>
        </div>
        <div className="px-4 py-3 border-b border-neutral-800">
          <input
            type="text"
            placeholder="Cerca chat…"
            value={searchArchive}
            onChange={(e) => setSearchArchive(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-white"
          />
        </div>
        <div className="p-3 overflow-y-auto h-[calc(100%-110px)] space-y-2">
          {filteredArchive.length === 0 ? (
            <div className="text-neutral-600 text-sm px-2 py-4">Nessuna sessione.</div>
          ) : (
            filteredArchive.map((s) => (
              <div
                key={s.id}
                className="border border-neutral-800 rounded-lg p-2 hover:bg-neutral-900 transition"
              >
                <div className="flex items-center gap-2">
                  {inlineEditId === s.id ? (
                    <input
                      value={inlineEditValue}
                      onChange={(e) => setInlineEditValue(e.target.value)}
                      onBlur={() => commitInlineRename(s.id)}
                      onKeyDown={(e) => e.key === "Enter" && commitInlineRename(s.id)}
                      autoFocus
                      className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
                    />
                  ) : (
                    <button
                      onClick={() => handleOpenSession(s.id)}
                      className="text-left text-sm flex-1"
                    >
                      <div className="text-xs text-neutral-400">
                        {s.title?.trim() ? s.title : `#${s.id.slice(-6)}`}
                      </div>
                      <div className="line-clamp-1 text-neutral-300">
                        {s.lastMessage || "—"}
                      </div>
                    </button>
                  )}
                  <button
                    onClick={() =>
                      inlineEditId === s.id
                        ? commitInlineRename(s.id)
                        : startInlineRename(s.id, s.title)
                    }
                    className="text-neutral-400 hover:text-white text-xs px-2"
                    title="Rinomina"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteSession(s.id)}
                    className="text-neutral-500 hover:text-red-400 text-xs px-2"
                    title="Cestina"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Cestino */}
      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-neutral-950 border-r border-neutral-800 z-40 transition-transform duration-300 ${
          showTrash ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-4 flex items-center justify-between border-b border-neutral-800">
          <h3 className="text-base font-semibold">Cestino</h3>
          <button
            onClick={() => setShowTrash(false)}
            className="text-sm text-neutral-400 hover:text-white"
          >
            Chiudi
          </button>
        </div>
        <div className="px-4 py-3 border-b border-neutral-800">
          <input
            type="text"
            placeholder="Cerca…"
            value={searchTrash}
            onChange={(e) => setSearchTrash(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-white"
          />
        </div>
        <div className="p-3 overflow-y-auto h-[calc(100%-110px)] space-y-2">
          {filteredTrash.length === 0 ? (
            <div className="text-neutral-600 text-sm px-2 py-4">
              Nessuna sessione cestinata.
            </div>
          ) : (
            filteredTrash.map((s) => (
              <div
                key={s.id}
                className="border border-neutral-800 rounded-lg p-2 hover:bg-neutral-900 transition"
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="text-neutral-400 line-clamp-1">
                      {s.title?.trim() ? s.title : `#${s.id.slice(-6)}`}
                    </div>
                    <div className="text-neutral-600 text-xs line-clamp-1">
                      {s.lastMessage || "—"}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestoreSession(s.id)}
                    className="text-green-400 hover:text-green-300 text-xs px-2"
                    title="Ripristina"
                  >
                    ♻️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Chat principale */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-center px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">
              Anova<span className="text-neutral-500"> β</span> — Chat
            </h2>
            <div className="flex items-center gap-2">
              {editingTitle ? (
                <input
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  onBlur={commitActiveTitle}
                  onKeyDown={(e) => e.key === "Enter" && commitActiveTitle()}
                  className="text-xs px-2 py-1 bg-neutral-900 border border-neutral-700 rounded"
                  autoFocus
                  placeholder={`#${sessionId?.slice(-6)}`}
                />
              ) : (
                <button
                  onClick={() => setEditingTitle(true)}
                  className="text-xs px-2 py-1 border border-neutral-800 rounded-lg text-neutral-400 hover:text-white"
                >
                  {sessionTitle?.trim() ? sessionTitle : `#${sessionId?.slice(-6)}`}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowArchive((v) => !v)}
              className="px-3 py-1 text-sm border border-neutral-700 rounded-lg hover:bg-neutral-900 transition"
            >
              Archivio
            </button>
            <button
              onClick={() => setShowTrash((v) => !v)}
              className="px-3 py-1 text-sm border border-neutral-700 rounded-lg hover:bg-neutral-900 transition"
            >
              Cestino
            </button>
            <button
              onClick={handleNewSession}
              className="px-3 py-1 text-sm border border-neutral-700 rounded-lg hover:bg-neutral-900 transition"
            >
              Nuova Chat
            </button>
          </div>
        </header>

        {/* Messaggi */}
        <section className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-neutral-600 text-center">
              Nessun messaggio ancora. Inizia a dialogare con Anova β.
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-2xl mx-auto rounded-xl p-4 ${
                  msg.sender === "user"
                    ? "bg-neutral-900 border border-neutral-700 text-right"
                    : "bg-neutral-800 border border-neutral-700 text-left"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.text}
                </p>
              </div>
            ))
          )}
        </section>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-3 border-t border-neutral-800 px-6 py-4 bg-black"
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
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-neutral-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fade z-50">
          {toastMessage}
        </div>
      )}

      {/* Costi */}
      <CostPanel
        totalReads={totalReads}
        totalWrites={totalWrites}
        onReset={resetCounters}
      />
    </main>
  );
}
// ⬆️ FINE BLOCCO 14.0 — ANOVA β Chat v4.0 (Definitiva)
