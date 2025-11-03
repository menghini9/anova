// ⬇️ BLOCCO 1 — mockFirestore.ts
// Simulazione locale del database Firestore (CRUD completo)

type Notizia = {
  id: string;
  titolo: string;
  contenuto: string;
  data: string;
};

// 🧩 Archivio locale simulato (mantiene i dati finché non ricarichi)
let notizieMock: Notizia[] = [];

// 🔹 Restituisce tutte le notizie
export const getAllNotizieMock = async (): Promise<Notizia[]> => {
  return [...notizieMock];
};

// 🔹 Aggiunge una nuova notizia con ID univoco
export const aggiungiNotiziaMock = async (
  titolo: string,
  contenuto: string
): Promise<Notizia> => {
  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const nuovaNotizia: Notizia = {
    id,
    titolo,
    contenuto,
    data: new Date().toLocaleString(),
  };

  notizieMock.unshift(nuovaNotizia);
  return nuovaNotizia;
};

// 🔹 Elimina una notizia per ID
export const eliminaNotiziaMock = async (id: string): Promise<void> => {
  notizieMock = notizieMock.filter((n) => n.id !== id);
};

// 🔹 Svuota completamente l’archivio
export const svuotaArchivioMock = async (): Promise<void> => {
  notizieMock = [];
};
// ⬆️ FINE BLOCCO 1
