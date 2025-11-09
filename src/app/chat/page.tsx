// ⬇️ BLOCCO 13.0 — ANOVA β Chat + Workspace v2.0 (definitiva)
"use client";

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
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// 🧩 Tipi
interface Message {
  id?: string;
  sender: "user" | "anova";
  text: string;
  createdAt?: any;
}

interface SessionMeta {
  id: string;
  title?: string;
  createdAt?: any;
  updatedAt?: any;
  lastMessage?: string;
  deleted?: boolean;
}

type BlockType = "note" | "code";

interface WorkspaceBlock {
  id?: string;
  type: BlockType;
  title: string;
  content: string;
  order?: number;
  createdAt?: any;
  updatedAt?: any;
}

export default function ChatPage() {
  // ⬇️ BLOCCO 13.1 — Stati principali
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState<string>("");
  const [editingTitle, setEditingTitle] = useState<boolean>(false);

  const [showArchive, setShowArchive] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(true);

  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [trashSessions, setTrashSessions] = useState<SessionMeta[]>([]);

  const [blocks, setBlocks] = useState<WorkspaceBlock[]>([]);
  const savingRef = useRef<NodeJS.Timeout | null>(null);
  // ⬆️ FINE BLOCCO 13.1

  // ⬇️ BLOCCO 13.2 — Bootstrap sessione (crea se manca + doc meta)
  useEffect(() => {
    let sid = localStorage.getItem("anovaSessionId");
    if (!sid) {
      sid = Date.now().toString();
      localStorage.setItem("anovaSessionId", sid);
      console.log("🆕 Sessione creata:", sid);
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
    );
  }, []);
  // ⬆️ FINE BLOCCO 13.2

  // ⬇️ BLOCCO 13.3 — Listener meta sessione (titolo)
  useEffect(() => {
    if (!sessionId) return;
    const sessRef = doc(db, "sessions", sessionId);
    const unsub = onSnapshot(sessRef, (snap) => {
      const data = snap.data() as SessionMeta | undefined;
      setSessionTitle(data?.title || "");
    });
    return () => unsub();
  }, [sessionId]);
  // ⬆️ FINE BLOCCO 13.3

  // ⬇️ BLOCCO 13.4 — Listener messaggi (sessione attiva)
  useEffect(() => {
    if (!sessionId) return;
    const messagesRef = collection(db, "sessions", sessionId, "messages");
    const qy = query(messagesRef, orderBy("createdAt", "asc"));

    const unsub = onSnapshot(qy, (snap) => {
      const m: Message[] = snap.docs.map((d) => {
        const data = d.data() as Omit<Message, "id">;
        return { id: d.id, ...data };
      });
      setMessages(m);
    });
    return () => unsub();
  }, [sessionId]);
  // ⬆️ FINE BLOCCO 13.4

  // ⬇️ BLOCCO 13.5 — Listener Workspace blocks (sessione attiva)
  useEffect(() => {
    if (!sessionId) return;
    const blocksRef = collection(db, "sessions", sessionId, "workspaceBlocks");
    const qy = query(blocksRef, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(qy, (snap) => {
      const b: WorkspaceBlock[] = snap.docs.map((d) => {
        const data = d.data() as Omit<WorkspaceBlock, "id">;
        return { id: d.id, ...data };
      });
      setBlocks(b);
    });
    return () => unsub();
  }, [sessionId]);
  // ⬆️ FINE BLOCCO 13.5

  // ⬇️ BLOCCO 13.6 — Listener Archivio/Cestino
  useEffect(() => {
    const qArchive = query(
      collection(db, "sessions"),
      where("deleted", "==", false),
      orderBy("updatedAt", "desc"),
      limit(50)
    );
    const unsubA = onSnapshot(qArchive, (snap) => {
      const list: SessionMeta[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<SessionMeta, "id">),
      }));
      setSessions(list);
    });

    const qTrash = query(
      collection(db, "sessions"),
      where("deleted", "==", true),
      orderBy("updatedAt", "desc"),
      limit(50)
    );
    const unsubT = onSnapshot(qTrash, (snap) => {
      const list: SessionMeta[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<SessionMeta, "id">),
      }));
      setTrashSessions(list);
    });

    return () => {
      unsubA();
      unsubT();
    };
  }, []);
  // ⬆️ FINE BLOCCO 13.6

  // ⬇️ BLOCCO 13.7 — Nuova sessione + benvenuto
  const handleNewSession = async () => {
    const newId = Date.now().toString();
    localStorage.setItem("anovaSessionId", newId);
    setSessionId(newId);

    const sessRef = doc(db, "sessions", newId);
    await setDoc(
      sessRef,
      {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: "Sessione avviata. Pronta per lavorare insieme.",
        deleted: false,
      },
      { merge: true }
    );

    const messagesRef = collection(db, "sessions", newId, "messages");
    await addDoc(messagesRef, {
      sender: "anova",
      text: "Sessione avviata. Pronta per lavorare insieme.",
      createdAt: serverTimestamp(),
    });

    setMessages([]);
    setBlocks([]);
    setSessionTitle("");
    setToastMessage("✅ Nuova sessione avviata");
    setTimeout(() => setToastMessage(null), 2000);
  };
  // ⬆️ FINE BLOCCO 13.7

  // ⬇️ BLOCCO 13.8 — Rinomina sessione (inline)
  const commitTitle = async () => {
    if (!sessionId) return;
    await updateDoc(doc(db, "sessions", sessionId), {
      title: sessionTitle || null,
      updatedAt: serverTimestamp(),
    });
    setEditingTitle(false);
    setToastMessage("✏️ Titolo aggiornato");
    setTimeout(() => setToastMessage(null), 1200);
  };
  // ⬆️ FINE BLOCCO 13.8

  // ⬇️ BLOCCO 13.9 — Apertura / cestino / restore
  const handleOpenSession = (id: string) => {
    localStorage.setItem("anovaSessionId", id);
    setSessionId(id);
    setShowArchive(false);
    setShowTrash(false);
    setToastMessage("📂 Sessione caricata");
    setTimeout(() => setToastMessage(null), 1200);
  };

  const handleDeleteSession = async (id: string) => {
    await updateDoc(doc(db, "sessions", id), {
      deleted: true,
      updatedAt: serverTimestamp(),
    });
    setToastMessage("🗑️ Sessione spostata nel cestino");
    setTimeout(() => setToastMessage(null), 1500);
  };

  const handleRestoreSession = async (id: string) => {
    await updateDoc(doc(db, "sessions", id), {
      deleted: false,
      updatedAt: serverTimestamp(),
    });
    setToastMessage("♻️ Sessione ripristinata");
    setTimeout(() => setToastMessage(null), 1500);
  };
  // ⬆️ FINE BLOCCO 13.9

  // ⬇️ BLOCCO 13.10 — Risposte AI simulate + auto-block Workspace
  const looksLikeCode = (txt: string) => {
    if (txt.includes("```")) return true;
    const heuristics = ["import ", "export ", ";", "{", "}", "<div", "function ", "=>"];
    return heuristics.some((h) => txt.includes(h));
  };

  const generateLocalResponse = (prompt: string) => {
    const lower = prompt.toLowerCase();
    if (lower.includes("ciao"))
      return "```ts\n// ⬇️ BLOCCO 1 — Esempio codice\nconsole.log('Ciao Luca, Anova β è pronta.');\n// ⬆️ FINE BLOCCO 1\n```";
    if (lower.includes("test") || lower.includes("prova"))
      return "Test eseguito correttamente. Sistema stabile.";
    if (lower.includes("chi sei"))
      return "Sono Anova β — un ponte tra te e le intelligenze artificiali.";
    if (lower.includes("tempo") || lower.includes("oggi"))
      return "Oggi è una buona giornata per creare.";
    return "Ricevuto. Elaboro internamente il contesto e preparo una risposta.";
  };

  const maybeCreateWorkspaceBlock = async (text: string) => {
    if (!sessionId) return;
    const code = looksLikeCode(text);
    if (!code) return;
    const blocksRef = collection(db, "sessions", sessionId, "workspaceBlocks");
    await addDoc(blocksRef, {
      type: "code",
      title: "Blocco generato dalla chat",
      content: text.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, ""),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setToastMessage("🧩 Blocco Workspace creato");
    setTimeout(() => setToastMessage(null), 1500);
  };
  // ⬆️ FINE BLOCCO 13.10

  // ⬇️ BLOCCO 13.11 — Invio messaggi (aggiorna meta + auto-block)
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
    await updateDoc(doc(db, "sessions", sessionId), {
      updatedAt: serverTimestamp(),
      lastMessage: trimmed,
    });

    setInput("");
    await new Promise((r) => setTimeout(r, 500));
    const aiResponse = generateLocalResponse(trimmed);

    await addDoc(messagesRef, {
      sender: "anova",
      text: aiResponse,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "sessions", sessionId), {
      updatedAt: serverTimestamp(),
      lastMessage: aiResponse,
    });

    // ➕ crea blocco Workspace se la risposta “sembra codice”
    await maybeCreateWorkspaceBlock(aiResponse);
  };
  // ⬆️ FINE BLOCCO 13.11

  // ⬇️ BLOCCO 13.12 — Workspace: azioni blocchi
  const addBlock = async (type: BlockType) => {
    if (!sessionId) return;
    const blocksRef = collection(db, "sessions", sessionId, "workspaceBlocks");
    const title =
      type === "code" ? "Nuovo blocco codice" : "Nuova nota";
    const template =
      type === "code"
        ? "// ⬇️ BLOCCO X — Titolo\n\n// codice qui\n\n// ⬆️ FINE BLOCCO X"
        : "Titolo nota\n\nTesto della nota...";
    await addDoc(blocksRef, {
      type,
      title,
      content: template,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const updateBlock = async (b: WorkspaceBlock) => {
    if (!sessionId || !b.id) return;
    // debounce soft: micro-ritardo per batch
    if (savingRef.current) clearTimeout(savingRef.current);
    savingRef.current = setTimeout(async () => {
      await updateDoc(
        doc(db, "sessions", sessionId, "workspaceBlocks", b.id!),
        {
          title: b.title,
          content: b.content,
          updatedAt: serverTimestamp(),
        }
      );
    }, 250);
  };

  const copyToClipboard = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      setToastMessage("📋 Copiato negli appunti");
      setTimeout(() => setToastMessage(null), 1200);
    } catch {
      console.error("Clipboard non disponibile");
    }
  };

  const applyBlock = (b: WorkspaceBlock) => {
    // Placeholder operativo: qui potresti inviare in un endpoint /api/apply
    console.log("🔧 APPLY blocco:", b.title);
    setToastMessage("🔧 Apply (placeholder)");
    setTimeout(() => setToastMessage(null), 1000);
  };

  const diffBlock = (b: WorkspaceBlock) => {
    // Placeholder Diff: integrazione futura con lib di diff
    console.log("🔍 DIFF blocco:", b.title);
    setToastMessage("🔍 Diff (placeholder)");
    setTimeout(() => setToastMessage(null), 1000);
  };
  // ⬆️ FINE BLOCCO 13.12

  // ⬇️ BLOCCO 13.13 — UI
  const activeLabel = useMemo(
    () => (sessionId ? (sessionTitle ? sessionTitle : `#${sessionId.slice(-6)}`) : "—"),
    [sessionId, sessionTitle]
  );

  return (
    <main className="h-screen w-screen flex bg-black text-neutral-100 relative">
      {/* ARCHIVIO */}
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
        <div className="p-3 overflow-y-auto h-[calc(100%-56px)] space-y-2">
          {sessions.length === 0 ? (
            <div className="text-neutral-600 text-sm px-2 py-4">
              Nessuna sessione.
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className="border border-neutral-800 rounded-lg p-2 hover:bg-neutral-900 transition"
              >
                <div className="flex justify-between items-center gap-2">
                  <button
                    onClick={() => handleOpenSession(s.id)}
                    className="text-left text-sm flex-1"
                  >
                    <div className="text-xs text-neutral-400">
                      {(s.title && s.title.trim()) ? s.title : `#${s.id.slice(-6)}`}
                    </div>
                    <div className="line-clamp-1 text-neutral-300">
                      {s.lastMessage || "—"}
                    </div>
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

      {/* CESTINO */}
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
        <div className="p-3 overflow-y-auto h-[calc(100%-56px)] space-y-2">
          {trashSessions.length === 0 ? (
            <div className="text-neutral-600 text-sm px-2 py-4">
              Nessuna sessione cestinata.
            </div>
          ) : (
            trashSessions.map((s) => (
              <div
                key={s.id}
                className="border border-neutral-800 rounded-lg p-2 hover:bg-neutral-900 transition"
              >
                <div className="flex justify-between items-center gap-2">
                  <button
                    onClick={() => handleOpenSession(s.id)}
                    className="text-left text-sm flex-1"
                  >
                    <div className="text-xs text-neutral-500">
                      {(s.title && s.title.trim()) ? s.title : `#${s.id.slice(-6)}`}
                    </div>
                    <div className="line-clamp-1 text-neutral-500">
                      {s.lastMessage || "—"}
                    </div>
                  </button>
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

      {/* COLONNA CHAT */}
      <div className="flex-1 flex flex-col">
        {/* HEADER */}
        <header className="flex justify-between items-center px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Anova<span className="text-neutral-500"> β</span> — Chat</h2>
            {/* Titolo/rename */}
            <div className="flex items-center gap-2">
              {editingTitle ? (
                <input
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={(e) => e.key === "Enter" && commitTitle()}
                  className="text-xs px-2 py-1 bg-neutral-900 border border-neutral-700 rounded"
                  autoFocus
                  placeholder={`#${sessionId?.slice(-6)}`}
                />
              ) : (
                <button
                  onClick={() => setEditingTitle(true)}
                  className="text-xs px-2 py-1 border border-neutral-800 rounded-lg text-neutral-400 hover:text-white"
                  title="Rinomina sessione"
                >
                  {activeLabel}
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
              onClick={() => setShowWorkspace((v) => !v)}
              className="px-3 py-1 text-sm border border-neutral-700 rounded-lg hover:bg-neutral-900 transition"
            >
              {showWorkspace ? "Nascondi Workspace" : "Mostra Workspace"}
            </button>
            <button
              onClick={handleNewSession}
              className="px-3 py-1 text-sm border border-neutral-700 rounded-lg hover:bg-neutral-900 transition"
            >
              Nuova Chat
            </button>
          </div>
        </header>

        {/* AREA MESSAGGI */}
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
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              </div>
            ))
          )}
        </section>

        {/* INPUT */}
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

      {/* WORKSPACE (colonna destra) */}
      <aside
        className={`h-full w-[36rem] max-w-[90vw] bg-neutral-950 border-l border-neutral-800 transition-transform duration-300 fixed right-0 top-0 z-30 ${
          showWorkspace ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="px-5 py-4 flex items-center justify-between border-b border-neutral-800">
          <h3 className="text-base font-semibold">Workspace</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => addBlock("note")}
              className="text-sm px-3 py-1 border border-neutral-700 rounded hover:bg-neutral-900"
            >
              + Nota
            </button>
            <button
              onClick={() => addBlock("code")}
              className="text-sm px-3 py-1 border border-neutral-700 rounded hover:bg-neutral-900"
            >
              + Codice
            </button>
            <button
              onClick={() => setShowWorkspace(false)}
              className="text-sm text-neutral-400 hover:text-white"
            >
              Chiudi
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto h-[calc(100%-56px)] space-y-4">
          {blocks.length === 0 ? (
            <div className="text-neutral-600 text-sm px-2 py-4">
              Nessun blocco ancora. Genera codice in chat o crea un blocco.
            </div>
          ) : (
            blocks.map((b, idx) => (
              <div
                key={b.id || idx}
                className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 space-y-2"
              >
                <input
                  value={b.title}
                  onChange={(e) =>
                    setBlocks((prev) =>
                      prev.map((x) =>
                        x.id === b.id ? { ...x, title: e.target.value } : x
                      )
                    )
                  }
                  onBlur={() => updateBlock({ ...b, title: (blocks.find(x => x.id === b.id)?.title || "") })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-1 text-sm"
                />
                <textarea
                  value={b.content}
                  onChange={(e) =>
                    setBlocks((prev) =>
                      prev.map((x) =>
                        x.id === b.id ? { ...x, content: e.target.value } : x
                      )
                    )
                  }
                  onBlur={() => updateBlock({ ...b, content: (blocks.find(x => x.id === b.id)?.content || "") })}
                  className={`w-full min-h-[160px] bg-neutral-950 border border-neutral-800 rounded p-3 text-sm font-mono ${
                    b.type === "code" ? "whitespace-pre" : "whitespace-pre-wrap"
                  }`}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(b.content)}
                    className="px-3 py-1 text-sm border border-neutral-700 rounded hover:bg-neutral-800"
                  >
                    Copia
                  </button>
                  <button
                    onClick={() => applyBlock(b)}
                    className="px-3 py-1 text-sm border border-neutral-700 rounded hover:bg-neutral-800"
                  >
                    Applica
                  </button>
                  <button
                    onClick={() => diffBlock(b)}
                    className="px-3 py-1 text-sm border border-neutral-700 rounded hover:bg-neutral-800"
                  >
                    Confronta (Diff)
                  </button>
                  <span className="ml-auto text-xs text-neutral-500">
                    {b.type === "code" ? "BLOCCO CODICE" : "NOTA"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* TOAST */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-neutral-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fade z-50">
          {toastMessage}
        </div>
      )}
    </main>
  );
}
// ⬆️ FINE BLOCCO 13.0
