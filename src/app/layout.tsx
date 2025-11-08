// ⬇️ BLOCCO 2 — Layout.tsx (Struttura persistente Anova β)
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Anova β",
  description: "Ambiente di lavoro AI personale di Luca",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
 <html
  lang="it"
  className="h-screen w-screen bg-neutral-950 overflow-hidden"
  style={{ margin: 0, padding: 0 }}
>
  <body
    className={`${inter.className} h-full w-full bg-neutral-950 text-neutral-100 flex flex-col`}
    style={{ margin: 0, padding: 0 }}
  >


        {/* 🔹 HEADER FISSO */}
        <header className="w-full flex justify-between items-center px-6 py-4 border-b border-neutral-800">
          <h1 className="text-xl font-semibold tracking-wide">
            <span className="text-white">ANOVA</span>
            <span className="text-neutral-500"> β</span>
          </h1>
          <div className="text-sm text-neutral-400">
            Ambiente operativo — v0.1 Beta
          </div>
        </header>

        {/* 🔹 CONTENUTO VARIABILE */}
        <main className="flex-1 flex flex-col items-center justify-center p-6">
          {children}
        </main>

        {/* 🔹 FOOTER */}
        <footer className="text-center text-neutral-700 text-xs py-4 border-t border-neutral-800">
          © {new Date().getFullYear()} Anova β — ambiente privato di lavoro
        </footer>
      </body>
    </html>
  );
}
// ⬆️ FINE BLOCCO 2
