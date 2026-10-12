import { ZENITH_APP_URL } from '@/lib/session';

const MESSAGES: Record<string, string> = {
  plan: "Votre compte Zénith n'a pas l'offre Expert.",
  invalide: 'Le lien de connexion a expiré ou a déjà été utilisé. Rouvrez BVC Live depuis Zénith.',
  indisponible: 'La vérification de votre compte est momentanément impossible. Réessayez dans un instant.',
};

export default async function Acces({ searchParams }: { searchParams: Promise<{ raison?: string }> }) {
  const { raison } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg p-8 text-center space-y-5">
        <div className="text-2xl font-bold tracking-widest" style={{ fontFamily: 'Georgia, serif' }}>
          Z<span style={{ color: '#C49A2E' }}>É</span>NITH <span className="text-amber-500 text-base align-middle">BVC Live</span>
        </div>
        <h1 className="text-lg font-semibold text-slate-900">Réservé aux abonnés Expert</h1>
        <p className="text-sm text-slate-600">
          {(raison && MESSAGES[raison]) ||
            'BVC Live, la Bourse de Casablanca en temps réel, est inclus dans l’offre Expert de Zénith. Connectez-vous à Zénith puis ouvrez « BVC Live » depuis le menu.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <a href={`${ZENITH_APP_URL}/login`} className="px-4 py-2 rounded-lg bg-[#1a1a2e] text-white text-sm font-semibold">Se connecter à Zénith</a>
          <a href={`${ZENITH_APP_URL}/pricing`} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold">Voir l’offre Expert</a>
        </div>
      </div>
    </main>
  );
}
