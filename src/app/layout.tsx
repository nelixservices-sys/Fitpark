import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "FitPark AI — Coach Fitness Intelligent",
  description:
    "Application de fitness ultra-personnalisée propulsée par l'IA Google Gemini. Programmes d'entraînement, analyse de posture, nutrition adaptée.",
  keywords: "fitness, musculation, IA, Gemini, Fitness Park, coach sportif",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
