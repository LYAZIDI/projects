import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

const LABEL_OPTIONS = [
  { value: 'LEATHER_PATCH', label: 'Patch en cuir', icon: 'style' },
  { value: 'WOVEN_LABEL', label: 'Étiquette tissée', icon: 'local_offer' },
  { value: 'EMBROIDERY', label: 'Broderie', icon: 'gesture' },
  { value: 'METAL_PLATE', label: 'Plaque métal', icon: 'hardware' },
  { value: 'NONE', label: 'Sans personnalisation', icon: 'block' }
];

@Component({
  selector: 'app-brand-studio',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, ReactiveFormsModule, MatInputModule,
            MatSelectModule, MatButtonModule, MatIconModule],
  template: `
    <div class="studio-page">

      <!-- Studio header -->
      <div class="studio-topbar">
        <a routerLink="/merchant/catalog" class="back-link">
          <mat-icon>arrow_back</mat-icon> Catalogue
        </a>
        <div class="studio-title">
          <mat-icon>brush</mat-icon>
          <span>Studio de Marque</span>
        </div>
        <div class="studio-actions">
          <button class="btn-secondary" (click)="resetForm()">Réinitialiser</button>
          <button class="btn-primary" (click)="publish()" [disabled]="!customized() || saving()">
            {{ saving() ? 'Publication...' : 'Publier dans ma boutique' }}
          </button>
        </div>
      </div>

      <div class="studio-body">

        <!-- Left: options panel -->
        <div class="options-panel">
          <div class="panel-section">
            <h3>Votre marque</h3>

            <div class="option-group">
              <label>Nom de la marque</label>
              <input type="text" [formControl]="brandNameControl"
                     placeholder="Ex: MaisonCuir" class="text-input">
            </div>

            <div class="option-group">
              <label>URL du logo (PNG/SVG transparent)</label>
              <input type="url" [formControl]="logoUrlControl"
                     placeholder="https://..." class="text-input"
                     (blur)="updatePreview()">
              @if (logoUrlControl.value) {
                <img [src]="logoUrlControl.value" alt="Logo preview" class="logo-preview"
                     (error)="logoError.set(true)">
                @if (logoError()) {
                  <span class="input-error">URL invalide ou image non accessible</span>
                }
              }
            </div>
          </div>

          <div class="panel-section">
            <h3>Type de personnalisation</h3>
            <div class="label-options">
              @for (opt of labelOptions; track opt.value) {
                <button class="label-opt" [class.selected]="selectedLabel() === opt.value"
                        (click)="selectedLabel.set(opt.value)">
                  <mat-icon>{{ opt.icon }}</mat-icon>
                  <span>{{ opt.label }}</span>
                </button>
              }
            </div>
          </div>

          <div class="panel-section">
            <h3>Personnalisation textile</h3>
            <div class="option-group">
              <label>Couleur du fil (broderie)</label>
              <div class="color-row">
                @for (color of threadColors; track color) {
                  <button class="color-swatch" [style.background]="color"
                          [class.selected]="selectedThread() === color"
                          (click)="selectedThread.set(color)"
                          [title]="color"></button>
                }
              </div>
            </div>

            <div class="option-group">
              <label>Couleur de la doublure</label>
              <div class="color-row">
                @for (color of liningColors; track color) {
                  <button class="color-swatch" [style.background]="color"
                          [class.selected]="selectedLining() === color"
                          (click)="selectedLining.set(color)"
                          [title]="color"></button>
                }
              </div>
            </div>

            <div class="option-group">
              <label>Texte gravé / personnalisé</label>
              <input type="text" [formControl]="engravingControl"
                     placeholder="Ex: ÉDITION LIMITÉE 2025" class="text-input"
                     maxlength="40">
              <span class="char-count">{{ engravingControl.value?.length ?? 0 }}/40</span>
            </div>
          </div>

          <div class="panel-section pricing-section">
            <h3>Tarification</h3>

            @if (baseProduct()) {
              <div class="price-breakdown">
                <div class="price-line">
                  <span>Prix grossiste (artisan)</span>
                  <span class="amount">{{ baseProduct()!.wholesalePrice | currency:'EUR':'symbol':'1.2-2' }}</span>
                </div>
                <div class="price-line">
                  <span>Commission plateforme (15%)</span>
                  <span class="amount neg">− {{ commission() | currency:'EUR':'symbol':'1.2-2' }}</span>
                </div>
                <div class="price-line total">
                  <span>Prix de vente conseillé</span>
                  <span class="amount">{{ baseProduct()!.price | currency:'EUR':'symbol':'1.2-2' }}</span>
                </div>
              </div>
            }

            <div class="option-group" style="margin-top: 16px">
              <label>Votre prix de vente (€)</label>
              <input type="number" [formControl]="retailPriceControl"
                     class="text-input" [placeholder]="baseProduct()?.price ?? 0">
              @if (margin() > 0) {
                <span class="margin-hint">Votre marge : {{ margin() | currency:'EUR':'symbol':'1.2-2' }}</span>
              }
            </div>
          </div>

          <button class="generate-btn" (click)="customize()" [disabled]="saving()">
            <mat-icon>auto_awesome</mat-icon>
            {{ customized() ? 'Mettre à jour' : 'Générer le produit' }}
          </button>

          @if (error()) {
            <div class="error-msg">{{ error() }}</div>
          }
        </div>

        <!-- Right: preview -->
        <div class="preview-panel">
          <div class="preview-label">Aperçu</div>

          @if (!baseProduct() && loading()) {
            <div class="preview-loading">Chargement du produit...</div>
          } @else if (baseProduct()) {
            <div class="product-preview">
              <div class="preview-image-wrap">
                <img [src]="baseProduct()!.images[0]?.url || 'assets/placeholder.png'"
                     [alt]="baseProduct()!.title" class="preview-img">

                <!-- Logo overlay on the product -->
                @if (logoUrlControl.value && !logoError()) {
                  <div class="logo-overlay">
                    <img [src]="logoUrlControl.value" alt="Brand logo" class="overlay-logo">
                  </div>
                }

                <!-- Label type badge -->
                @if (selectedLabel() !== 'NONE') {
                  <div class="label-badge">
                    <mat-icon>{{ getLabelIcon() }}</mat-icon>
                    <span>{{ getLabelName() }}</span>
                  </div>
                }

                <!-- Thread color indicator -->
                @if (selectedThread()) {
                  <div class="thread-indicator" [style.background]="selectedThread()">
                    <span>Fil</span>
                  </div>
                }
              </div>

              <div class="preview-info">
                <div class="preview-brand">
                  @if (brandNameControl.value) {
                    <strong>{{ brandNameControl.value }}</strong>
                  } @else {
                    <em>Votre marque</em>
                  }
                </div>
                <h2>{{ baseProduct()!.title }}</h2>
                <p class="artisan-credit">Fabriqué par {{ baseProduct()!.artisanBrand }}</p>

                @if (engravingControl.value) {
                  <div class="engraving-preview">
                    <mat-icon>text_fields</mat-icon>
                    "{{ engravingControl.value }}"
                  </div>
                }

                <div class="preview-price">
                  {{ (retailPriceControl.value || baseProduct()!.price) | currency:'EUR':'symbol':'1.2-2' }}
                </div>

                <!-- Lining color band -->
                @if (selectedLining()) {
                  <div class="lining-preview">
                    <span class="lining-dot" [style.background]="selectedLining()"></span>
                    <span>Doublure {{ selectedLining() }}</span>
                  </div>
                }
              </div>
            </div>

            @if (customized()) {
              <div class="success-banner">
                <mat-icon>check_circle</mat-icon>
                <span>Produit personnalisé créé ! Publiez-le dans votre boutique.</span>
              </div>
            }
          }
        </div>

      </div>
    </div>
  `,
  styles: [`
    .studio-page { background: var(--off-white); min-height: calc(100vh - 116px); }

    /* Topbar */
    .studio-topbar {
      display: flex; align-items: center; gap: 16px;
      background: white; border-bottom: 1px solid var(--border);
      padding: 14px 32px;
    }
    .back-link {
      display: flex; align-items: center; gap: 6px;
      color: var(--text-secondary); font-size: 12px; text-decoration: none;
      mat-icon { font-size: 18px; } &:hover { color: var(--black); }
    }
    .studio-title {
      flex: 1; display: flex; align-items: center; gap: 8px; justify-content: center;
      font-size: 13px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase;
      color: var(--text-secondary);
      mat-icon { color: var(--gold-dark); }
    }
    .studio-actions { display: flex; gap: 10px; }
    .btn-secondary {
      background: none; border: 1px solid var(--border); padding: 9px 20px;
      font-size: 11px; font-weight: 600; letter-spacing: 0.1em; cursor: pointer;
      &:hover { border-color: var(--black); }
    }
    .btn-primary {
      background: var(--burgundy); color: white; border: none;
      padding: 10px 24px; font-size: 11px; font-weight: 600; letter-spacing: 0.15em;
      text-transform: uppercase; cursor: pointer;
      &:hover:not(:disabled) { background: #8B1A2A; }
      &:disabled { opacity: 0.5; cursor: default; }
    }

    /* Studio body */
    .studio-body { display: grid; grid-template-columns: 400px 1fr; gap: 0; min-height: calc(100vh - 170px); }

    /* Options panel */
    .options-panel {
      background: white; border-right: 1px solid var(--border);
      padding: 28px 24px; overflow-y: auto; max-height: calc(100vh - 170px);
    }
    .panel-section { margin-bottom: 28px; padding-bottom: 28px; border-bottom: 1px solid var(--border);
      h3 { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 600;
           color: var(--black); margin-bottom: 16px; }
    }
    .option-group { margin-bottom: 16px;
      label { display: block; font-size: 10px; font-weight: 700; letter-spacing: 0.15em;
              text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px; }
    }
    .text-input {
      width: 100%; border: 1px solid var(--border); padding: 10px 14px;
      font-size: 14px; font-family: 'Montserrat', sans-serif; outline: none;
      transition: border-color 0.2s; box-sizing: border-box;
      &:focus { border-color: var(--gold-dark); }
    }
    .char-count { font-size: 11px; color: var(--text-secondary); float: right; }
    .logo-preview { max-width: 100%; max-height: 60px; margin-top: 8px; border: 1px solid var(--border); padding: 4px; }
    .input-error { color: #C62828; font-size: 11px; display: block; margin-top: 4px; }
    .margin-hint { color: #388E3C; font-size: 12px; font-weight: 600; display: block; margin-top: 6px; }

    /* Label options */
    .label-options { display: flex; flex-direction: column; gap: 8px; }
    .label-opt {
      display: flex; align-items: center; gap: 12px;
      background: var(--off-white); border: 1px solid var(--border);
      padding: 12px 16px; cursor: pointer; text-align: left; transition: all 0.2s;
      mat-icon { color: var(--text-secondary); font-size: 20px; }
      span { font-size: 13px; color: var(--text-secondary); }
      &.selected { border-color: var(--gold); background: #FFFDF5;
                   mat-icon { color: var(--gold-dark); } span { color: var(--black); font-weight: 500; } }
      &:hover { border-color: var(--gold-dark); }
    }

    /* Color swatches */
    .color-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .color-swatch {
      width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent;
      cursor: pointer; transition: transform 0.15s;
      &.selected { border-color: var(--black); transform: scale(1.2); }
      &:hover { transform: scale(1.1); }
    }

    /* Pricing */
    .pricing-section { border-bottom: none; }
    .price-breakdown { background: var(--off-white); border: 1px solid var(--border); padding: 16px; }
    .price-line {
      display: flex; justify-content: space-between; padding: 6px 0;
      font-size: 13px; color: var(--text-secondary); border-bottom: 1px solid var(--border);
      &:last-child { border-bottom: none; }
      &.total { font-weight: 600; color: var(--black); }
      .neg { color: #C62828; }
    }

    .generate-btn {
      width: 100%; background: var(--black); color: var(--cream); border: none;
      padding: 16px; font-size: 12px; font-weight: 600; letter-spacing: 0.2em;
      text-transform: uppercase; cursor: pointer; display: flex; align-items: center;
      justify-content: center; gap: 8px; margin-top: 8px;
      mat-icon { font-size: 20px; }
      &:hover:not(:disabled) { background: var(--gold-dark); }
      &:disabled { opacity: 0.5; cursor: default; }
    }
    .error-msg { color: #C62828; font-size: 13px; padding: 10px 14px; background: #FFEBEE; margin-top: 12px; }

    /* Preview panel */
    .preview-panel {
      padding: 32px 40px; background: #F8F5F0;
      position: relative;
    }
    .preview-label {
      font-size: 10px; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase;
      color: var(--text-secondary); margin-bottom: 24px;
    }
    .preview-loading { text-align: center; padding: 80px; color: var(--text-secondary); }

    .product-preview {
      max-width: 440px; background: white; border: 1px solid var(--border);
      overflow: hidden;
    }
    .preview-image-wrap {
      position: relative; aspect-ratio: 4/3; overflow: hidden; background: #EDE8E0;
    }
    .preview-img { width: 100%; height: 100%; object-fit: cover; }

    .logo-overlay {
      position: absolute; bottom: 16px; right: 16px;
      background: rgba(255,255,255,0.9); backdrop-filter: blur(4px);
      padding: 8px 12px; border: 1px solid rgba(255,255,255,0.8);
      max-width: 100px;
      img { max-width: 80px; max-height: 40px; object-fit: contain; display: block; }
    }
    .label-badge {
      position: absolute; top: 12px; left: 12px;
      background: rgba(0,0,0,0.7); color: white; backdrop-filter: blur(4px);
      display: flex; align-items: center; gap: 6px;
      padding: 6px 12px; font-size: 10px; font-weight: 600; letter-spacing: 0.1em;
      mat-icon { font-size: 14px; }
    }
    .thread-indicator {
      position: absolute; top: 12px; right: 12px;
      width: 24px; height: 24px; border-radius: 50%; border: 2px solid white;
      display: flex; align-items: center; justify-content: center;
      span { display: none; }
    }

    .preview-info { padding: 24px; }
    .preview-brand { font-size: 10px; font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase;
                     color: var(--gold-dark); margin-bottom: 8px; }
    .preview-info h2 { font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 500;
                        color: var(--black); margin-bottom: 6px; }
    .artisan-credit { font-size: 12px; color: var(--text-secondary); margin-bottom: 14px; }
    .engraving-preview {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: var(--text-secondary); font-style: italic;
      margin-bottom: 14px; padding: 8px 12px; background: var(--off-white);
      mat-icon { font-size: 16px; }
    }
    .preview-price { font-family: 'Cormorant Garamond', serif; font-size: 28px;
                     font-weight: 600; color: var(--black); margin-bottom: 12px; }
    .lining-preview { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-secondary); }
    .lining-dot { width: 14px; height: 14px; border-radius: 50%; display: inline-block; flex-shrink: 0; }

    .success-banner {
      display: flex; align-items: center; gap: 10px; margin-top: 16px;
      background: #E8F5E9; border: 1px solid #A5D6A7; padding: 14px 20px;
      color: #388E3C; font-size: 13px; font-weight: 500;
      mat-icon { font-size: 20px; }
    }
  `]
})
export class BrandStudioComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  readonly labelOptions = LABEL_OPTIONS;
  readonly threadColors = ['#1A1A1A', '#8B4513', '#C49A6C', '#FFFFFF', '#D4AF37', '#8B0000', '#2C3E50', '#F5DEB3'];
  readonly liningColors = ['#F5F5DC', '#000000', '#C0392B', '#2980B9', '#27AE60', '#8E44AD', '#F39C12', '#ECF0F1'];

  baseProduct = signal<any>(null);
  loading = signal(true);
  saving = signal(false);
  customized = signal(false);
  error = signal('');
  logoError = signal(false);

  selectedLabel = signal('LEATHER_PATCH');
  selectedThread = signal('#1A1A1A');
  selectedLining = signal('#F5F5DC');

  brandNameControl = this.fb.control('');
  logoUrlControl = this.fb.control('');
  engravingControl = this.fb.control('');
  retailPriceControl = this.fb.control<number | null>(null);

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('productId');
    if (!productId) return;

    this.http.get<any>(`${environment.apiUrl}/products/${productId}`).subscribe({
      next: p => {
        this.baseProduct.set(p);
        this.retailPriceControl.setValue(p.price);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Produit introuvable.');
      }
    });
  }

  commission(): number {
    return (this.baseProduct()?.price ?? 0) * 0.15;
  }

  margin(): number {
    const retail = this.retailPriceControl.value ?? 0;
    const wholesale = this.baseProduct()?.wholesalePrice ?? 0;
    const commission = retail * 0.15;
    return retail - wholesale - commission;
  }

  getLabelIcon(): string {
    return LABEL_OPTIONS.find(o => o.value === this.selectedLabel())?.icon ?? 'style';
  }

  getLabelName(): string {
    return LABEL_OPTIONS.find(o => o.value === this.selectedLabel())?.label ?? '';
  }

  updatePreview(): void {
    this.logoError.set(false);
  }

  resetForm(): void {
    this.brandNameControl.reset('');
    this.logoUrlControl.reset('');
    this.engravingControl.reset('');
    this.selectedLabel.set('LEATHER_PATCH');
    this.selectedThread.set('#1A1A1A');
    this.selectedLining.set('#F5F5DC');
    this.customized.set(false);
    this.error.set('');
  }

  customize(): void {
    const productId = this.route.snapshot.paramMap.get('productId');
    if (!productId) return;

    this.saving.set(true);
    this.error.set('');

    const body = {
      merchantLogoUrl: this.logoUrlControl.value || null,
      labelType: this.selectedLabel(),
      threadColor: this.selectedThread(),
      liningColor: this.selectedLining(),
      engravingText: this.engravingControl.value || null,
      retailPrice: this.retailPriceControl.value ?? this.baseProduct()?.price
    };

    this.http.post<any>(`${environment.apiUrl}/branding/customize/${productId}`, body).subscribe({
      next: () => {
        this.customized.set(true);
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Erreur lors de la personnalisation.');
        this.saving.set(false);
      }
    });
  }

  publish(): void {
    this.router.navigate(['/merchant/my-products']);
  }
}
