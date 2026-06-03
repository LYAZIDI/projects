import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <div class="footer-main page-container">

        <div class="footer-brand">
          <img src="assets/logo.svg" alt="Leathera" height="50" style="filter: brightness(0) invert(1) sepia(1) saturate(2) hue-rotate(5deg) brightness(0.8)">
          <p>L'art du cuir véritable depuis 1987.<br>Chaque pièce est une promesse d'éternité.</p>
          <div class="social-links">
            <a href="#" aria-label="Instagram">IG</a>
            <a href="#" aria-label="Facebook">FB</a>
            <a href="#" aria-label="Pinterest">PT</a>
          </div>
        </div>

        <div class="footer-col">
          <h4>Collections</h4>
          <a routerLink="/products">Vestes & Blousons</a>
          <a routerLink="/products">Pantalons</a>
          <a routerLink="/products">Accessoires</a>
          <a routerLink="/products">Nouveautés</a>
        </div>

        <div class="footer-col">
          <h4>Mon Compte</h4>
          <a routerLink="/auth/login">Connexion</a>
          <a routerLink="/auth/register">Créer un compte</a>
          <a routerLink="/account/orders">Mes commandes</a>
          <a routerLink="/account">Mon profil</a>
        </div>

        <div class="footer-col">
          <h4>Service Client</h4>
          <a routerLink="/">FAQ</a>
          <a routerLink="/">Guide des tailles</a>
          <a routerLink="/">Entretien du cuir</a>
          <a routerLink="/">Retours & échanges</a>
        </div>

      </div>

      <div class="footer-bottom">
        <div class="footer-bottom-inner page-container">
          <p>&copy; {{ year }} LEATHERA — Maison de Cuir. Tous droits réservés.</p>
          <div class="footer-legal">
            <a href="#">Mentions légales</a>
            <a href="#">CGV</a>
            <a href="#">Confidentialité</a>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      background: var(--black);
      color: rgba(245,240,232,0.6);
      border-top: 1px solid var(--border-dark);
    }
    .footer-main {
      display: grid;
      grid-template-columns: 1.8fr 1fr 1fr 1fr;
      gap: 48px;
      padding: 64px 32px 48px;
    }
    .footer-brand {
      p { font-size: 13px; line-height: 1.8; margin: 20px 0 24px; color: rgba(245,240,232,0.5); }
    }
    .social-links {
      display: flex;
      gap: 16px;
      a {
        color: rgba(245,240,232,0.4);
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-decoration: none;
        border: 1px solid rgba(245,240,232,0.15);
        padding: 6px 10px;
        transition: all 0.2s;
        &:hover { color: var(--gold); border-color: var(--gold-dark); }
      }
    }
    .footer-col {
      h4 {
        font-family: 'Montserrat', sans-serif;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.3em;
        text-transform: uppercase;
        color: var(--cream);
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--border-dark);
      }
      a {
        display: block;
        color: rgba(245,240,232,0.5);
        font-size: 12px;
        font-weight: 300;
        letter-spacing: 0.05em;
        margin-bottom: 10px;
        text-decoration: none;
        transition: color 0.2s;
        &:hover { color: var(--gold-light); }
      }
    }
    .footer-bottom {
      border-top: 1px solid var(--border-dark);
      padding: 20px 0;
    }
    .footer-bottom-inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 32px;
    }
    p { font-size: 10px; letter-spacing: 0.1em; color: rgba(245,240,232,0.3); }
    .footer-legal {
      display: flex;
      gap: 24px;
      a {
        font-size: 10px;
        color: rgba(245,240,232,0.3);
        letter-spacing: 0.1em;
        text-decoration: none;
        &:hover { color: var(--gold); }
      }
    }
  `]
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
}
