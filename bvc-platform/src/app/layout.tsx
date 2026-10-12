import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zénith — Marchés Marocains',
  description: 'Plateforme d\'analyse des marchés boursiers de la Bourse de Casablanca en temps réel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
