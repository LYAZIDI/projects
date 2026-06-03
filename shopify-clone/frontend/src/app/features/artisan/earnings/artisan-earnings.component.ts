import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MarketplaceService } from '../../../core/services/marketplace.service';

@Component({
  selector: 'app-artisan-earnings',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, MatIconModule],
  template: `
    <div class="artisan-layout">
      <aside class="sidebar">
        <nav class="sidebar-nav">
          <a routerLink="/artisan/dashboard"><mat-icon>dashboard</mat-icon> Tableau de bord</a>
          <a routerLink="/artisan/products"><mat-icon>inventory_2</mat-icon> Mes produits</a>
          <a routerLink="/artisan/earnings" class="active"><mat-icon>account_balance_wallet</mat-icon> Revenus</a>
        </nav>
      </aside>

      <main class="main-content">
        <div class="page-header">
          <div>
            <h1>Mes Revenus</h1>
            <p>Historique de vos commissions et paiements</p>
          </div>
        </div>

        @if (stats()) {
          <div class="summary-cards">
            <div class="summary-card highlight">
              <span class="label">Revenus totaux (virés)</span>
              <span class="value">{{ stats()!.totalRevenue | currency:'EUR':'symbol':'1.2-2' }}</span>
              <span class="note">Via Stripe Connect</span>
            </div>
            <div class="summary-card">
              <span class="label">Commandes reçues</span>
              <span class="value">{{ stats()!.totalOrders }}</span>
            </div>
            <div class="summary-card">
              <span class="label">Commission plateforme</span>
              <span class="value">15%</span>
              <span class="note">Par vente réalisée</span>
            </div>
          </div>
        }

        <!-- Stripe connect notice -->
        <div class="stripe-notice">
          <div class="notice-icon">
            <mat-icon>account_balance</mat-icon>
          </div>
          <div class="notice-content">
            <h4>Paiements via Stripe Connect</h4>
            <p>Vos revenus sont virés automatiquement sur votre compte bancaire via Stripe dès qu'une commande est confirmée. Aucune action requise de votre part.</p>
          </div>
          <div class="notice-status ok">
            <mat-icon>check_circle</mat-icon>
            <span>Compte connecté</span>
          </div>
        </div>

        <!-- Commissions table -->
        <div class="table-card">
          <div class="table-header">
            <h2>Détail des commissions</h2>
          </div>

          @if (loading()) {
            <div class="loading-state">Chargement...</div>
          } @else if (commissions().length === 0) {
            <div class="empty-state">
              <mat-icon>receipt_long</mat-icon>
              <p>Aucune commission pour le moment.</p>
            </div>
          } @else {
            <table class="data-table">
              <thead>
                <tr>
                  <th>Commande</th>
                  <th>Commerçant</th>
                  <th>Prix de vente</th>
                  <th>Votre part (gros)</th>
                  <th>Commission plat.</th>
                  <th>Date</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                @for (c of commissions(); track c.id) {
                  <tr>
                    <td class="mono">{{ c.order?.orderNumber ?? '—' }}</td>
                    <td>{{ c.merchant?.brandName ?? '—' }}</td>
                    <td>{{ c.saleAmount | currency:'EUR':'symbol':'1.2-2' }}</td>
                    <td class="amount-positive">{{ c.wholesaleAmount | currency:'EUR':'symbol':'1.2-2' }}</td>
                    <td class="amount-neutral">{{ c.platformAmount | currency:'EUR':'symbol':'1.2-2' }}</td>
                    <td>{{ c.paidAt | date:'dd/MM/yyyy' }}</td>
                    <td><span class="badge" [class]="c.status.toLowerCase()">{{ c.status }}</span></td>
                  </tr>
                }
              </tbody>
            </table>

            @if (totalPages() > 1) {
              <div class="pagination">
                <button [disabled]="page() === 0" (click)="prevPage()">
                  <mat-icon>chevron_left</mat-icon>
                </button>
                <span>Page {{ page() + 1 }} / {{ totalPages() }}</span>
                <button [disabled]="page() >= totalPages() - 1" (click)="nextPage()">
                  <mat-icon>chevron_right</mat-icon>
                </button>
              </div>
            }
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    .artisan-layout { display: grid; grid-template-columns: 260px 1fr; min-height: calc(100vh - 116px); background: var(--off-white); }
    .sidebar { background: var(--black); padding: 24px 0; }
    .sidebar-nav {
      display: flex; flex-direction: column;
      a {
        display: flex; align-items: center; gap: 12px; padding: 13px 24px;
        color: rgba(245,240,232,0.5); font-size: 12px; text-decoration: none; transition: all 0.2s;
        mat-icon { font-size: 18px; width: 18px; height: 18px; }
        &:hover, &.active { color: var(--gold); }
        &.active { border-left: 2px solid var(--gold); background: rgba(197,168,110,0.08); }
      }
    }

    .main-content { padding: 40px 48px; }
    .page-header { margin-bottom: 28px;
      h1 { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 500; margin-bottom: 4px; }
      p { font-size: 13px; color: var(--text-secondary); }
    }

    .summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 24px; }
    .summary-card {
      background: white; border: 1px solid var(--border); padding: 24px;
      display: flex; flex-direction: column; gap: 6px;
      &.highlight { background: var(--black); }
      .label { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-secondary); }
      .value { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 600; color: var(--black); }
      .note { font-size: 11px; color: var(--text-secondary); }
      &.highlight .label, &.highlight .note { color: rgba(245,240,232,0.5); }
      &.highlight .value { color: var(--gold); }
    }

    .stripe-notice {
      display: flex; align-items: center; gap: 20px;
      background: white; border: 1px solid var(--border); border-left: 3px solid var(--gold);
      padding: 20px 24px; margin-bottom: 24px;
    }
    .notice-icon { mat-icon { color: var(--gold-dark); font-size: 28px; } }
    .notice-content { flex: 1;
      h4 { font-size: 14px; font-weight: 600; color: var(--black); margin-bottom: 4px; }
      p { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
    }
    .notice-status { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;
      &.ok { color: #388E3C; mat-icon { font-size: 18px; } }
    }

    .table-card { background: white; border: 1px solid var(--border); }
    .table-header { padding: 24px 24px 16px; border-bottom: 1px solid var(--border);
      h2 { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 500; }
    }
    .data-table {
      width: 100%; border-collapse: collapse;
      th, td { padding: 14px 20px; text-align: left; font-size: 13px; border-bottom: 1px solid var(--border); }
      th { font-size: 10px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-secondary); }
      .mono { font-family: monospace; font-size: 12px; }
      .amount-positive { font-weight: 600; color: #388E3C; }
      .amount-neutral { color: var(--text-secondary); }
    }
    .badge {
      font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 3px 10px;
      &.transferred { background: #E8F5E9; color: #388E3C; }
      &.calculated { background: #FFF8E7; color: var(--gold-dark); }
      &.pending { background: #F5F5F5; color: var(--text-secondary); }
      &.failed { background: #FFEBEE; color: #C62828; }
    }
    .pagination {
      display: flex; align-items: center; justify-content: center; gap: 16px; padding: 20px;
      button {
        background: none; border: 1px solid var(--border); width: 36px; height: 36px;
        display: flex; align-items: center; justify-content: center; cursor: pointer;
        &:disabled { opacity: 0.4; cursor: default; }
        &:hover:not(:disabled) { border-color: var(--gold-dark); }
      }
      span { font-size: 13px; color: var(--text-secondary); }
    }
    .empty-state, .loading-state { padding: 40px; text-align: center; color: var(--text-secondary);
      mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--border); display: block; margin: 0 auto 12px; }
    }
  `]
})
export class ArtisanEarningsComponent implements OnInit {
  private marketplaceService = inject(MarketplaceService);

  commissions = signal<any[]>([]);
  stats = signal<any>(null);
  loading = signal(true);
  page = signal(0);
  totalPages = signal(0);

  ngOnInit(): void {
    this.marketplaceService.getArtisanStats().subscribe(s => this.stats.set(s));
    this.loadPage();
  }

  loadPage(): void {
    this.loading.set(true);
    this.marketplaceService.getArtisanCommissions(this.page(), 10).subscribe({
      next: (data: any) => {
        this.commissions.set(data.content ?? []);
        this.totalPages.set(data.totalPages ?? 1);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  prevPage(): void { this.page.update(p => p - 1); this.loadPage(); }
  nextPage(): void { this.page.update(p => p + 1); this.loadPage(); }
}
