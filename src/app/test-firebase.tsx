// ⬇️ BLOCCO 1 — Test connessione Firebase
"use client";

import { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";

// Importa le variabili d’ambiente
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export default function TestFirebase() {
  const [status, setStatus] = useState("Inizializzazione...");

  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      console.log("✅ Firebase connesso:", app.name);
      setStatus("✅ Connessione riuscita: " + app.name);
    } catch (error) {
      console.error("❌ Errore Firebase:", error);
      setStatus("❌ Errore di connessione — controlla la console");
    }
  }, []);

  return (
    <div style={{ padding: "40px", fontFamily: "monospace" }}>
      <h2>Test Firebase</h2>
      <p>{status}</p>
    </div>
  );
}
// ⬆️ FINE BLOCCO 1
