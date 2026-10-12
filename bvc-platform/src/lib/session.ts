/**
 * Session BVC Live : cookie signé (HMAC-SHA256, BVC_SESSION_SECRET) ouvert après
 * vérification d'un laissez-passer Zénith (offre Expert). Durée : 12 heures ; au-delà,
 * l'utilisateur repasse par le menu « BVC Live » de Zénith, ce qui revérifie son plan.
 */
import crypto from 'crypto';

export const COOKIE_SESSION = 'bvc_session';
export const DUREE_SESSION_S = 12 * 60 * 60;

export const ZENITH_APP_URL = process.env.ZENITH_APP_URL ?? 'https://asfim-reporting.vercel.app';
export const ZENITH_API_URL = process.env.ZENITH_API_URL ?? 'https://backend-liard-five-5152cnpq2m.vercel.app';

export interface Session { uid: string; email: string; name: string | null; exp: number }

function secret(): string {
  const s = process.env.BVC_SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('BVC_SESSION_SECRET manquant ou trop court (32 caractères minimum)');
  return s;
}

const signature = (data: string) => crypto.createHmac('sha256', secret()).update(data).digest('base64url');

export function creerSession(u: Omit<Session, 'exp'>): string {
  const data = Buffer.from(JSON.stringify({ ...u, exp: Math.floor(Date.now() / 1000) + DUREE_SESSION_S })).toString('base64url');
  return `${data}.${signature(data)}`;
}

/** null si absente, falsifiée ou expirée. */
export function lireSession(valeur: string | undefined): Session | null {
  if (!valeur) return null;
  const [data, sig] = valeur.split('.');
  if (!data || !sig) return null;
  try {
    const attendue = Buffer.from(signature(data));
    const recue = Buffer.from(sig);
    if (attendue.length !== recue.length || !crypto.timingSafeEqual(attendue, recue)) return null;
    const s = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as Session;
    return s.exp > Date.now() / 1000 ? s : null;
  } catch {
    return null;
  }
}
