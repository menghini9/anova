// ⬇️ BLOCCO 1 — Configurazione completa Firebase + Firestore
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// ⚙️ Lettura variabili sicura da .env.local
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// ✅ Evita di inizializzare Firebase più volte
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 🔥 Inizializza Firestore
export const db = getFirestore(app);

// 🧠 Esporta app principale se serve in altri moduli (Auth, Storage, ecc.)
export default app;

// ⬆️ FINE BLOCCO 1
