import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { loadProducts } from '../../../store/product/product.reducer';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <!-- HERO -->
    <section class="hero">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <p class="hero-eyebrow">NOUVELLE COLLECTION 2026</p>
        <h1>L'Art du<br><em>Cuir Véritable</em></h1>
        <div class="gold-line"></div>
        <p class="hero-sub">Pièces artisanales en cuir pleine fleur,<br>tannées selon les méthodes traditionnelles.</p>
        <div class="hero-actions">
          <a routerLink="/products" class="btn-hero-primary">EXPLORER LA COLLECTION</a>
          <a routerLink="/products" class="btn-hero-outline">NOTRE SAVOIR-FAIRE</a>
        </div>
      </div>
      <div class="hero-scroll">
        <span>SCROLL</span>
        <div class="scroll-line"></div>
      </div>
    </section>

    <!-- VALUES STRIP -->
    <section class="values-strip">
      <div class="value-item">
        <span class="value-icon">✦</span>
        <span>CUIR PLEINE FLEUR</span>
      </div>
      <div class="value-divider"></div>
      <div class="value-item">
        <span class="value-icon">✦</span>
        <span>FABRICATION ARTISANALE</span>
      </div>
      <div class="value-divider"></div>
      <div class="value-item">
        <span class="value-icon">✦</span>
        <span>LIVRAISON OFFERTE DÈS 200€</span>
      </div>
      <div class="value-divider"></div>
      <div class="value-item">
        <span class="value-icon">✦</span>
        <span>RETOURS 30 JOURS</span>
      </div>
    </section>

    <!-- CATEGORIES -->
    <section class="categories page-container">
      <div class="section-title">
        <p class="eyebrow">NOS UNIVERS</p>
        <h2>Collections</h2>
        <div class="gold-divider"></div>
      </div>
      <div class="categories-grid">
        <a routerLink="/products" class="category-card large">
          <div class="category-bg" style="background: linear-gradient(160deg, #1a0a00 0%, #3d1a0a 100%)"></div>
          <div class="category-info">
            <h3>Vestes & Blousons</h3>
            <span>Voir la collection →</span>
          </div>
        </a>
        <a routerLink="/products" class="category-card">
          <div class="category-bg" style="background: linear-gradient(160deg, #0d0d0d 0%, #2c1810 100%)"></div>
          <div class="category-info">
            <h3>Pantalons</h3>
            <span>Voir la collection →</span>
          </div>
        </a>
        <a routerLink="/products" class="category-card">
          <div class="category-bg" style="background: linear-gradient(160deg, #1a0505 0%, #4a1520 100%)"></div>
          <div class="category-info">
            <h3>Accessoires</h3>
            <span>Voir la collection →</span>
          </div>
        </a>
      </div>
    </section>

    <!-- EDITORIAL BAND -->
    <section class="editorial-band">
      <div class="editorial-content page-container">
        <div class="editorial-text">
          <p class="eyebrow">NOTRE PHILOSOPHIE</p>
          <h2>Le cuir comme<br>seconde peau</h2>
          <div class="gold-divider"></div>
          <p>Chaque pièce Leathera est confectionnée à partir de cuirs sélectionnés pour leur grain, leur souplesse et leur caractère. Nos artisans perpétuent des gestes ancestraux pour créer des vêtements qui se bonifient avec le temps.</p>
          <a routerLink="/products" class="btn-editorial">DÉCOUVRIR →</a>
        </div>
        <div class="editorial-visual">
          <div class="visual-block"></div>
          <div class="visual-accent"></div>
        </div>
      </div>
    </section>

    <!-- FEATURED PRODUCTS -->
    <section class="featured page-container">
      <div class="section-title">
        <p class="eyebrow">SÉLECTION</p>
        <h2>Pièces Iconiques</h2>
        <div class="gold-divider"></div>
      </div>
      <div class="featured-cta">
        <a routerLink="/products" class="btn-primary-leather">VOIR TOUTE LA COLLECTION</a>
      </div>
    </section>

    <!-- FOOTER BAND -->
    <section class="footer-band">
      <div class="footer-band-content page-container">
        <h2>Rejoignez le Club Leathera</h2>
        <p>Accédez en avant-première aux nouvelles collections et offres exclusives</p>
        <div class="newsletter-form">
          <input type="email" placeholder="VOTRE ADRESSE EMAIL">
          <button class="btn-newsletter">S'INSCRIRE</button>
        </div>
      </div>
    </section>
  `,
  styles: [`
    /* HERO */
    .hero {
      position: relative;
      height: 92vh;
      min-height: 600px;
      background: linear-gradient(135deg, #0D0D0D 0%, #1a0a00 40%, #2C1810 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .hero::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        radial-gradient(ellipse at 20% 50%, rgba(201,168,76,0.08) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 20%, rgba(201,168,76,0.05) 0%, transparent 50%);
    }
    .hero-content {
      position: relative;
      text-align: center;
      color: var(--cream);
      z-index: 2;
      padding: 0 24px;
    }
    .hero-eyebrow {
      font-size: 10px;
      letter-spacing: 0.4em;
      color: var(--gold);
      margin-bottom: 24px;
      font-weight: 500;
    }
    .hero-content h1 {
      font-family: 'Cormorant Garamond', serif;
      font-size: clamp(52px, 8vw, 96px);
      font-weight: 300;
      line-height: 1.05;
      color: var(--cream);
      margin-bottom: 24px;
      em { font-style: italic; color: var(--gold-light); }
    }
    .gold-line {
      width: 60px; height: 1px;
      background: var(--gold);
      margin: 0 auto 24px;
    }
    .hero-sub {
      font-size: 14px;
      font-weight: 300;
      letter-spacing: 0.08em;
      color: rgba(245,240,232,0.7);
      line-height: 1.8;
      margin-bottom: 40px;
    }
    .hero-actions { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
    .btn-hero-primary {
      background: var(--gold);
      color: var(--black);
      padding: 16px 40px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      text-decoration: none;
      transition: all 0.3s;
      &:hover { background: var(--gold-light); transform: translateY(-1px); }
    }
    .btn-hero-outline {
      border: 1px solid rgba(245,240,232,0.4);
      color: var(--cream);
      padding: 15px 39px;
      font-size: 10px;
      font-weight: 400;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      text-decoration: none;
      transition: all 0.3s;
      &:hover { border-color: var(--gold); color: var(--gold-light); }
    }
    .hero-scroll {
      position: absolute;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: rgba(245,240,232,0.4);
      font-size: 9px;
      letter-spacing: 0.3em;
      .scroll-line {
        width: 1px; height: 40px;
        background: linear-gradient(to bottom, rgba(201,168,76,0.6), transparent);
        animation: scrollPulse 2s ease-in-out infinite;
      }
    }
    @keyframes scrollPulse {
      0%, 100% { opacity: 0.4; transform: scaleY(1); }
      50% { opacity: 1; transform: scaleY(1.1); }
    }

    /* VALUES STRIP */
    .values-strip {
      background: var(--black);
      border-top: 1px solid var(--border-dark);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px 40px;
      gap: 32px;
      flex-wrap: wrap;
    }
    .value-item {
      display: flex;
      align-items: center;
      gap: 10px;
      color: rgba(245,240,232,0.6);
      font-size: 10px;
      letter-spacing: 0.2em;
      font-weight: 500;
    }
    .value-icon { color: var(--gold); font-size: 8px; }
    .value-divider { width: 1px; height: 20px; background: var(--border-dark); }

    /* CATEGORIES */
    .categories { padding: 80px 32px; }
    .section-title {
      text-align: center;
      margin-bottom: 48px;
      .eyebrow { font-size: 10px; letter-spacing: 0.4em; color: var(--gold-dark); font-weight: 500; margin-bottom: 12px; }
      h2 { font-family: 'Cormorant Garamond', serif; font-size: 40px; font-weight: 400; margin-bottom: 16px; }
    }
    .gold-divider { width: 48px; height: 1px; background: var(--gold); margin: 0 auto; }
    .categories-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr;
      gap: 16px;
      margin-top: 40px;
    }
    .category-card {
      position: relative;
      height: 480px;
      overflow: hidden;
      text-decoration: none;
      display: block;
      &.large { height: 480px; }
      &:hover .category-bg { transform: scale(1.03); }
      &:hover .category-info h3 { color: var(--gold-light); }
    }
    .category-bg {
      position: absolute;
      inset: 0;
      transition: transform 0.6s ease;
    }
    .category-card::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%);
    }
    .category-info {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 28px;
      z-index: 2;
      h3 {
        font-family: 'Cormorant Garamond', serif;
        font-size: 26px;
        font-weight: 400;
        color: var(--cream);
        margin-bottom: 8px;
        transition: color 0.3s;
      }
      span {
        font-size: 10px;
        color: var(--gold);
        letter-spacing: 0.15em;
        text-transform: uppercase;
      }
    }

    /* EDITORIAL */
    .editorial-band {
      background: var(--charcoal);
      padding: 100px 0;
    }
    .editorial-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 80px;
      align-items: center;
    }
    .editorial-text {
      .eyebrow { font-size: 10px; letter-spacing: 0.4em; color: var(--gold); font-weight: 500; margin-bottom: 16px; display: block; }
      h2 { font-family: 'Cormorant Garamond', serif; font-size: 44px; font-weight: 300; color: var(--cream); line-height: 1.2; margin-bottom: 20px; }
      .gold-divider { margin: 20px 0; width: 48px; height: 1px; background: var(--gold); }
      p { color: rgba(245,240,232,0.6); font-weight: 300; line-height: 1.9; margin-bottom: 32px; font-size: 14px; }
    }
    .btn-editorial {
      color: var(--gold);
      font-size: 11px;
      letter-spacing: 0.25em;
      font-weight: 500;
      text-decoration: none;
      border-bottom: 1px solid var(--gold-dark);
      padding-bottom: 4px;
      transition: all 0.2s;
      &:hover { color: var(--gold-light); border-color: var(--gold-light); }
    }
    .editorial-visual {
      position: relative;
      height: 420px;
      .visual-block {
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, #2C1810 0%, #1a0a00 100%);
        border: 1px solid var(--border-dark);
      }
      .visual-accent {
        position: absolute;
        top: -16px;
        right: -16px;
        width: 120px;
        height: 120px;
        border: 1px solid var(--gold);
        opacity: 0.3;
      }
    }

    /* FEATURED */
    .featured { padding: 80px 32px; text-align: center; }
    .featured-cta { margin-top: 40px; }
    .btn-primary-leather {
      display: inline-block;
      background: var(--black);
      color: var(--cream);
      padding: 16px 48px;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      text-decoration: none;
      border: 1px solid var(--black);
      transition: all 0.3s;
      &:hover { background: transparent; color: var(--black); border-color: var(--black); }
    }

    /* NEWSLETTER */
    .footer-band {
      background: var(--gold-dark);
      padding: 64px 0;
    }
    .footer-band-content {
      text-align: center;
      h2 { font-family: 'Cormorant Garamond', serif; font-size: 36px; color: var(--cream); font-weight: 400; margin-bottom: 8px; }
      p { color: rgba(245,240,232,0.8); margin-bottom: 32px; font-size: 13px; letter-spacing: 0.05em; }
    }
    .newsletter-form {
      display: flex;
      max-width: 440px;
      margin: 0 auto;
      gap: 0;
      input {
        flex: 1;
        padding: 14px 20px;
        background: rgba(0,0,0,0.25);
        border: 1px solid rgba(245,240,232,0.3);
        border-right: none;
        color: var(--cream);
        font-family: 'Montserrat', sans-serif;
        font-size: 11px;
        letter-spacing: 0.1em;
        outline: none;
        &::placeholder { color: rgba(245,240,232,0.5); }
      }
      .btn-newsletter {
        background: var(--black);
        color: var(--cream);
        border: 1px solid var(--black);
        padding: 14px 24px;
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.2em;
        cursor: pointer;
        transition: background 0.3s;
        &:hover { background: var(--charcoal); }
      }
    }
  `]
})
export class HomeComponent implements OnInit {
  private store = inject(Store);

  ngOnInit(): void {
    this.store.dispatch(loadProducts({ page: 0, size: 8 }));
  }
}
