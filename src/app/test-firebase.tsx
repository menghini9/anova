"use client";

import { useState, useEffect } from "react";
import {
  getAllNotizieMock as getAllNotizie,
  aggiungiNotiziaMock as aggiungiNotizia,
  eliminaNotiziaMock as eliminaNotizia,
} from "../firebase/mockFirestore";

export default function ArchivioNotizie() {
  const [notizie, setNotizie] = useState<any[]>([]);
  const [titolo, setTitolo] = useState("");
  const [contenuto, setContenuto] = useState("");
  const [caricamento, setCaricamento] = useState(true);

  // ⚡ Carica tutte le notizie quando la pagina viene aperta
  useEffect(() => {
    const fetchData = async () => {
      const data = await getAllNotizie();
      setNotizie(data);
      setCaricamento(false);
    };
    fetchData();
  }, []);

  // ➕ Aggiunge una nuova notizia
  const handleAggiungi = async () => {
    if (!titolo.trim() || !contenuto.trim()) return;
    const nuova = await aggiungiNotizia(titolo, contenuto);
    setNotizie((prev) => [nuova, ...prev]);
    setTitolo("");
    setContenuto("");
  };

  // ❌ Elimina una notizia per ID
  const handleElimina = async (id: string) => {
    await eliminaNotizia(id);
    setNotizie((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-black text-white p-6">
      <h1 className="text-3xl font-semibold mb-6 flex items-center gap-2">
        📰 Archivio Notizie Anova
      </h1>

      {/* 🟢 Form Inserimento */}
      <div className="bg-neutral-900 rounded-2xl p-6 shadow-lg w-full max-w-md mb-10">
        <input
          type="text"
          placeholder="Titolo notizia"
          value={titolo}
          onChange={(e) => setTitolo(e.target.value)}
          className="w-full mb-4 p-3 rounded-lg bg-neutral-800 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-green-600"
        />
        <textarea
          placeholder="Contenuto..."
          value={contenuto}
          onChange={(e) => setContenuto(e.target.value)}
          rows={4}
          className="w-full mb-4 p-3 rounded-lg bg-neutral-800 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-green-600"
        />
        <button
          onClick={handleAggiungi}
          className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-500 text-lg font-semibold transition"
        >
          Aggiungi Notizia
        </button>
      </div>

      {/* 🔵 Elenco Notizie */}
      <div className="w-full max-w-2xl space-y-4">
        {caricamento ? (
          <p className="text-gray-400 text-center">Caricamento...</p>
        ) : notizie.length === 0 ? (
          <p className="text-gray-500 text-center">
            Nessuna notizia presente.
          </p>
        ) : (
          notizie.map((n) => (
            <div
              key={n.id}
              className="bg-neutral-900 p-5 rounded-2xl shadow-md border border-neutral-800 flex justify-between items-start"
            >
              <div>
                <h2 className="text-lg font-semibold">{n.titolo}</h2>
                <p className="text-gray-400 mt-1">{n.contenuto}</p>
                <p className="text-gray-600 text-sm mt-2">{n.data}</p>
              </div>
              <button
                onClick={() => handleElimina(n.id)}
                className="ml-4 text-red-500 hover:text-red-400 font-bold text-xl"
                title="Elimina notizia"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
// ⬆️ FINE BLOCCO 2
