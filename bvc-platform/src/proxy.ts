/**
 * BVC Live est réservé aux abonnés Expert de Zénith : toute page ou API sans session
 * valide est refusée (pages → /acces, API → 401). Restent publics : la page d'accès,
 * l'entrée depuis Zénith (/auth/zenith) et les tâches de collecte, protégées par leur
 * propre secret (/api/scraper/*).
 */
import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_SESSION, lireSession } from '@/lib/session';

export function proxy(req: NextRequest) {
  if (lireSession(req.cookies.get(COOKIE_SESSION)?.value)) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: "BVC Live est réservé aux abonnés Expert de Zénith." }, { status: 401 });
  }
  return NextResponse.redirect(new URL('/acces', req.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\.ico|acces|auth/zenith|api/scraper).*)'],
};
