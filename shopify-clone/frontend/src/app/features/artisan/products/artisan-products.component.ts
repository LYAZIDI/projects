import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-artisan-products',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, MatIconModule, ReactiveFormsModule,
            MatInputModule, MatButtonModule, MatDialogModule],
  template: `
    <div class="artisan-layout">
      <aside class="sidebar">
        <div class="sidebar-header">
          <a routerLink="/artisan/dashboard" class="back-link">
            <mat-icon>arrow_back</mat-icon> Dashboard
          </a>
        </div>
        <nav class="sidebar-nav">
          <a routerLink="/artisan/dashboard"><mat-icon>dashboard</mat-icon> Tableau de bord</a>
          <a routerLink="/artisan/products" class="active"><mat-icon>inventory_2</mat-icon> Mes produits</a>
          <a routerLink="/artisan/earnings"><mat-icon>account_balance_wallet</mat-icon> Revenus</a>
        </nav>
      </aside>

      <main class="main-content">
        <div class="page-header">
          <div>
            <h1>Mes Produits</h1>
            <p>Gérez votre catalogue artisanal</p>
          </div>
          <button class="btn-primary" (click)="showForm.set(!showForm())">
            <mat-icon>{{ showForm() ? 'close' : 'add' }}</mat-icon>
            {{ showForm() ? 'Annuler' : 'Nouveau produit' }}
          </button>
        </div>

        <!-- Add product form -->
        @if (showForm()) {
          <div class="form-card">
            <h3>Ajouter un produit</h3>
            <form [formGroup]="productForm" (ngSubmit)="addProduct()" class="product-form">
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Titre du produit</mat-label>
                  <input matInput formControlName="title">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Slug URL</mat-label>
                  <input matInput formControlName="slug" placeholder="mon-sac-cuir">
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline">
                <mat-label>Description</mat-label>
                <textarea matInput formControlName="description" rows="3"></textarea>
              </mat-form-field>

              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Prix de vente (€)</mat-label>
                  <input matInput type="number" formControlName="price">
                  <span matSuffix>€</span>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Prix de gros (€)</mat-label>
                  <input matInput type="number" formControlName="wholesalePrice">
                  <span matSuffix>€</span>
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline">
                <mat-label>URL de l'image principale</mat-label>
                <input matInput formControlName="imageUrl" placeholder="https://...">
                <mat-icon matSuffix>image</mat-icon>
              </mat-form-field>

              @if (error()) {
                <div class="error-msg">{{ error() }}</div>
              }

              <div class="form-actions">
                <button mat-raised-button class="submit-btn" type="submit"
                        [disabled]="productForm.invalid || saving()">
                  {{ saving() ? 'Enregistrement...' : 'Publier le produit' }}
                </button>
              </div>
            </form>
          </div>
        }

        <!-- Products list -->
        @if (loading()) {
          <div class="loading-state">Chargement des produits...</div>
        } @else if (products().length === 0) {
          <div class="empty-state">
            <mat-icon>inventory_2</mat-icon>
            <h3>Aucun produit</h3>
            <p>Ajoutez votre premier produit artisanal pour le mettre en vente.</p>
          </div>
        } @else {
          <div class="products-grid">
            @for (product of products(); track product.id) {
              <div class="product-card">
                <div class="product-image">
                  <img [src]="product.images[0]?.url || 'assets/placeholder.png'" [alt]="product.title">
                  <div class="product-status" [class.active]="product.status === 'ACTIVE'">
                    {{ product.status === 'ACTIVE' ? 'En ligne' : 'Brouillon' }}
                  </div>
                </div>
                <div class="product-info">
                  <h4>{{ product.title }}</h4>
                  <div class="price-row">
                    <span class="retail-price">{{ product.price | currency:'EUR':'symbol':'1.2-2' }}</span>
                    <span class="wholesale-label">Gros: {{ product.wholesalePrice | currency:'EUR':'symbol':'1.2-2' }}</span>
                  </div>
                  <div class="product-meta">
                    <span><mat-icon>store</mat-icon> {{ product.ordersCount ?? 0 }} commandes</span>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .artisan-layout { display: grid; grid-template-columns: 260px 1fr; min-height: calc(100vh - 116px); background: var(--off-white); }

    .sidebar { background: var(--black); padding: 24px 0; }
    .sidebar-header { padding: 0 24px 20px; border-bottom: 1px solid var(--border-dark); margin-bottom: 12px; }
    .back-link {
      display: flex; align-items: center; gap: 8px; color: rgba(245,240,232,0.5);
      font-size: 12px; text-decoration: none; transition: color 0.2s;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover { color: var(--cream); }
    }
    .sidebar-nav {
      display: flex; flex-direction: column;
      a {
        display: flex; align-items: center; gap: 12px; padding: 13px 24px;
        color: rgba(245,240,232,0.5); font-size: 12px; text-decoration: none; transition: all 0.2s;
        mat-icon { font-size: 18px; width: 18px; height: 18px; }
        &:hover, &.active { color: var(--gold); background: rgba(197,168,110,0.08); }
        &.active { border-left: 2px solid var(--gold); }
      }
    }

    .main-content { padding: 40px 48px; }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px;
      h1 { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 500; margin-bottom: 4px; }
      p { font-size: 13px; color: var(--text-secondary); }
    }
    .btn-primary {
      display: flex; align-items: center; gap: 8px; background: var(--black); color: var(--cream);
      padding: 12px 24px; font-size: 11px; font-weight: 600; letter-spacing: 0.15em;
      text-transform: uppercase; border: none; cursor: pointer;
      mat-icon { font-size: 18px; }
      &:hover { background: var(--gold-dark); }
    }

    .form-card {
      background: white; border: 1px solid var(--border); padding: 32px; margin-bottom: 28px;
      h3 { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 500; margin-bottom: 24px; }
    }
    .product-form { display: flex; flex-direction: column; gap: 12px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    mat-form-field { width: 100%; }
    .form-actions { display: flex; justify-content: flex-end; margin-top: 8px; }
    .submit-btn { background: var(--black) !important; color: var(--cream) !important;
                  padding: 12px 32px !important; font-size: 11px !important; letter-spacing: 0.15em !important; }
    .error-msg { color: #C62828; font-size: 13px; padding: 8px 12px; background: #FFEBEE; }

    .products-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .product-card { background: white; border: 1px solid var(--border); overflow: hidden; }
    .product-image {
      position: relative; aspect-ratio: 4/3; overflow: hidden;
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .product-status {
      position: absolute; top: 10px; right: 10px;
      font-size: 9px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;
      padding: 4px 10px; background: #F5F5F5; color: var(--text-secondary);
      &.active { background: #E8F5E9; color: #388E3C; }
    }
    .product-info { padding: 18px; }
    h4 { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 500;
         color: var(--black); margin-bottom: 8px; }
    .price-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .retail-price { font-size: 16px; font-weight: 600; color: var(--black); }
    .wholesale-label { font-size: 11px; color: var(--text-secondary); }
    .product-meta {
      display: flex; gap: 16px;
      span { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-secondary); }
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .empty-state {
      text-align: center; padding: 80px 24px;
      mat-icon { font-size: 56px; width: 56px; height: 56px; color: var(--border); display: block; margin: 0 auto 16px; }
      h3 { font-family: 'Cormorant Garamond', serif; font-size: 26px; margin-bottom: 8px; }
      p { font-size: 14px; color: var(--text-secondary); }
    }
    .loading-state { padding: 40px; text-align: center; color: var(--text-secondary); }
  `]
})
export class ArtisanProductsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  products = signal<any[]>([]);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);
  error = signal('');

  productForm = this.fb.group({
    title: ['', Validators.required],
    slug: ['', Validators.required],
    description: ['', Validators.required],
    price: [null, [Validators.required, Validators.min(1)]],
    wholesalePrice: [null, [Validators.required, Validators.min(1)]],
    imageUrl: ['']
  });

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/products?page=0&size=20`).subscribe({
      next: (data) => {
        this.products.set(data.content ?? data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  addProduct(): void {
    if (this.productForm.invalid) return;
    this.saving.set(true);
    this.error.set('');

    const { title, slug, description, price, wholesalePrice, imageUrl } = this.productForm.value;
    const body = {
      title, slug, description, price, wholesalePrice,
      status: 'ACTIVE',
      images: imageUrl ? [{ url: imageUrl, position: 0 }] : []
    };

    this.http.post<any>(`${environment.apiUrl}/products`, body).subscribe({
      next: (product) => {
        this.products.update(list => [product, ...list]);
        this.productForm.reset();
        this.showForm.set(false);
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Erreur lors de la création du produit.');
        this.saving.set(false);
      }
    });
  }
}
