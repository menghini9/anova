// ⬇️ BLOCCO 1 — Gestione Firestore: lettura e scrittura notizie
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

// ✅ Aggiungi una nuova notizia
export const aggiungiNotizia = async (titolo: string, contenuto: string) => {
  try {
    const docRef = await addDoc(collection(db, "notizie"), {
      titolo,
      contenuto,
      data: new Date().toISOString(),
    });
    console.log("Notizia aggiunta con ID:", docRef.id);
  } catch (e) {
    console.error("Errore nell'aggiunta della notizia:", e);
  }
};

// ✅ Leggi tutte le notizie
export const getAllNotizie = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "notizie"));
    const notizie: { titolo: string; contenuto: string; data: string }[] = [];
    querySnapshot.forEach((doc) => {
      notizie.push(doc.data() as { titolo: string; contenuto: string; data: string });
    });
    return notizie;
  } catch (e) {
    console.error("Errore nel recupero notizie:", e);
    return [];
  }
};
// ⬆️ FINE BLOCCO 1
