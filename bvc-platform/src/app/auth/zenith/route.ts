/**
 * POST /auth/zenith — entrée depuis Zénith (menu « BVC Live », offre Expert).
 * Le laissez-passer reçu est vérifié par l'API Zénith (signature, usage unique, plan
 * Expert), puis une session BVC Live de 12 h est ouverte.
 */
import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_SESSION, DUREE_SESSION_S, ZENITH_API_URL, creerSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const ticket = form?.get('ticket');
  const refus = (raison: string) => NextResponse.redirect(new URL(`/acces?raison=${raison}`, req.url), 303);
  if (typeof ticket !== 'string' || !ticket) return refus('invalide');

  let verif: Response;
  try {
    verif = await fetch(`${ZENITH_API_URL}/api/public/bvc/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket }),
      cache: 'no-store',
    });
  } catch {
    return refus('indisponible');
  }
  if (verif.status === 403) return refus('plan');
  if (!verif.ok) return refus('invalide');

  const { user } = await verif.json();
  const res = NextResponse.redirect(new URL('/live', req.url), 303);
  res.cookies.set(COOKIE_SESSION, creerSession({ uid: user.id, email: user.email, name: user.name ?? null }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DUREE_SESSION_S,
  });
  return res;
}

// Une entrée par simple lien (sans laissez-passer) mène à la page d'accès
export function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/acces', req.url), 303);
}
