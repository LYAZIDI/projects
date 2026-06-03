import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { Store } from '@ngrx/store';
import { AuthActions } from '../../../store/auth/auth.actions';

type Role = 'CUSTOMER' | 'ARTISAN' | 'MERCHANT';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatInputModule, MatButtonModule,
            MatCardModule, MatSelectModule, MatIconModule],
  template: `
    <div class="auth-page">

      <!-- Role selector step -->
      @if (!selectedRole()) {
        <div class="role-select-page">
          <div class="role-header">
            <img src="assets/logo.svg" alt="Leathera" height="56">
            <h1>Rejoindre la plateforme</h1>
            <p>Choisissez votre profil pour commencer</p>
          </div>

          <div class="role-cards">
            <button class="role-card" (click)="selectRole('CUSTOMER')">
              <div class="role-icon">
                <mat-icon>shopping_bag</mat-icon>
              </div>
              <h3>Client</h3>
              <p>Découvrez des créations en cuir uniques fabriquées à la main par des artisans passionnés.</p>
              <span class="role-badge">Accès gratuit</span>
            </button>

            <button class="role-card featured" (click)="selectRole('ARTISAN')">
              <div class="role-icon">
                <mat-icon>handyman</mat-icon>
              </div>
              <div class="role-tag">ARTISAN</div>
              <h3>Artisan / Producteur</h3>
              <p>Listez vos créations en cuir et vendez-les en gros à des commerçants du monde entier.</p>
              <span class="role-badge">Commission 15%</span>
            </button>

            <button class="role-card" (click)="selectRole('MERCHANT')">
              <div class="role-icon">
                <mat-icon>storefront</mat-icon>
              </div>
              <h3>Commerçant / Revendeur</h3>
              <p>Personnalisez des produits artisanaux avec votre marque et revendez-les sous votre nom.</p>
              <span class="role-badge">White-label</span>
            </button>
          </div>

          <p class="login-link">Déjà inscrit ? <a routerLink="/auth/login">Se connecter</a></p>
        </div>
      }

      <!-- Registration form step -->
      @if (selectedRole()) {
        <div class="form-page">
          <div class="form-header">
            <button class="back-btn" (click)="selectedRole.set(null)">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div class="role-chip" [class]="selectedRole()!.toLowerCase()">
              <mat-icon>{{ roleIcon() }}</mat-icon>
              {{ roleLabel() }}
            </div>
          </div>

          <div class="form-card">
            <h2>Créer votre compte</h2>

            <form [formGroup]="form" (ngSubmit)="onSubmit()">
              <div class="name-row">
                <mat-form-field appearance="outline">
                  <mat-label>Prénom</mat-label>
                  <input matInput formControlName="firstName">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Nom</mat-label>
                  <input matInput formControlName="lastName">
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput type="email" formControlName="email">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Mot de passe</mat-label>
                <input matInput type="password" formControlName="password">
                <mat-hint>Minimum 8 caractères</mat-hint>
              </mat-form-field>

              @if (selectedRole() === 'ARTISAN' || selectedRole() === 'MERCHANT') {
                <div class="section-divider">
                  <span>Votre marque</span>
                </div>

                <mat-form-field appearance="outline">
                  <mat-label>Nom de la marque / atelier</mat-label>
                  <input matInput formControlName="brandName">
                  <mat-icon matSuffix>label</mat-icon>
                </mat-form-field>

                @if (selectedRole() === 'ARTISAN') {
                  <mat-form-field appearance="outline">
                    <mat-label>Bio / Description de votre savoir-faire</mat-label>
                    <textarea matInput formControlName="bio" rows="3"
                              placeholder="Ex: Maroquinier depuis 15 ans, spécialisé en maroquinerie haut de gamme..."></textarea>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Localisation (ville, pays)</mat-label>
                    <input matInput formControlName="location" placeholder="Ex: Lyon, France">
                    <mat-icon matSuffix>location_on</mat-icon>
                  </mat-form-field>
                }
              }

              <button mat-raised-button class="submit-btn" type="submit"
                      [disabled]="form.invalid">
                Créer mon compte
                <mat-icon>arrow_forward</mat-icon>
              </button>
            </form>

            <p class="login-link">Déjà inscrit ? <a routerLink="/auth/login">Se connecter</a></p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      background: var(--off-white);
    }

    /* ─── Role selection ─── */
    .role-select-page {
      max-width: 960px;
      margin: 0 auto;
      padding: 60px 24px 80px;
      text-align: center;
    }

    .role-header {
      margin-bottom: 48px;
      img { margin-bottom: 24px; }
      h1 {
        font-family: 'Cormorant Garamond', serif;
        font-size: 40px;
        font-weight: 500;
        color: var(--black);
        margin-bottom: 8px;
      }
      p {
        font-size: 14px;
        color: var(--text-secondary);
        letter-spacing: 0.05em;
      }
    }

    .role-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-bottom: 40px;
    }

    .role-card {
      position: relative;
      background: white;
      border: 1px solid var(--border);
      padding: 40px 28px;
      cursor: pointer;
      text-align: center;
      transition: all 0.3s;
      display: flex;
      flex-direction: column;
      align-items: center;

      &:hover {
        border-color: var(--gold-dark);
        transform: translateY(-4px);
        box-shadow: 0 12px 40px rgba(0,0,0,0.08);
      }

      &.featured {
        border-color: var(--gold);
        background: linear-gradient(160deg, #FFFDF9 0%, white 100%);
      }

      .role-icon {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--off-white);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 20px;
        mat-icon { color: var(--gold-dark); font-size: 26px; width: 26px; height: 26px; }
      }

      .role-tag {
        position: absolute;
        top: 16px;
        right: 16px;
        background: var(--gold);
        color: white;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.2em;
        padding: 3px 8px;
      }

      h3 {
        font-family: 'Cormorant Garamond', serif;
        font-size: 22px;
        font-weight: 600;
        color: var(--black);
        margin-bottom: 12px;
      }

      p {
        font-size: 13px;
        line-height: 1.7;
        color: var(--text-secondary);
        margin-bottom: 20px;
        flex: 1;
      }

      .role-badge {
        display: inline-block;
        border: 1px solid var(--border);
        color: var(--text-secondary);
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.15em;
        padding: 5px 12px;
        text-transform: uppercase;
      }
    }

    /* ─── Form step ─── */
    .form-page {
      max-width: 520px;
      margin: 0 auto;
      padding: 40px 24px 80px;
    }

    .form-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 32px;
    }

    .back-btn {
      background: none;
      border: 1px solid var(--border);
      width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      &:hover { border-color: var(--gold-dark); background: var(--off-white); }
      mat-icon { font-size: 20px; color: var(--text-secondary); }
    }

    .role-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      padding: 6px 14px;
      border: 1px solid var(--border);

      mat-icon { font-size: 16px; width: 16px; height: 16px; }

      &.artisan { border-color: var(--gold); color: var(--gold-dark); }
      &.merchant { border-color: var(--burgundy); color: var(--burgundy); }
      &.customer { border-color: var(--border); color: var(--text-secondary); }
    }

    .form-card {
      background: white;
      border: 1px solid var(--border);
      padding: 40px 36px;

      h2 {
        font-family: 'Cormorant Garamond', serif;
        font-size: 30px;
        font-weight: 500;
        color: var(--black);
        margin-bottom: 28px;
      }
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .name-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    mat-form-field { width: 100%; }

    .section-divider {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 8px 0;

      span {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--text-secondary);
        white-space: nowrap;
      }

      &::before, &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--border);
      }
    }

    .submit-btn {
      margin-top: 12px;
      background: var(--black) !important;
      color: var(--cream) !important;
      height: 52px;
      font-size: 11px !important;
      letter-spacing: 0.2em !important;
      font-weight: 600 !important;
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
    }

    .login-link {
      text-align: center;
      margin-top: 20px;
      font-size: 13px;
      color: var(--text-secondary);
      a { color: var(--gold-dark); text-decoration: none; font-weight: 500; }
    }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private store = inject(Store);

  selectedRole = signal<Role | null>(null);

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    brandName: [''],
    bio: [''],
    location: ['']
  });

  selectRole(role: Role): void {
    this.selectedRole.set(role);
  }

  roleLabel(): string {
    const labels: Record<Role, string> = {
      CUSTOMER: 'Client',
      ARTISAN: 'Artisan',
      MERCHANT: 'Commerçant'
    };
    return labels[this.selectedRole()!];
  }

  roleIcon(): string {
    const icons: Record<Role, string> = {
      CUSTOMER: 'shopping_bag',
      ARTISAN: 'handyman',
      MERCHANT: 'storefront'
    };
    return icons[this.selectedRole()!];
  }

  onSubmit(): void {
    if (this.form.valid && this.selectedRole()) {
      const { firstName, lastName, email, password, brandName, bio, location } = this.form.value;
      this.store.dispatch(AuthActions.register({
        request: {
          firstName: firstName!,
          lastName: lastName!,
          email: email!,
          password: password!,
          role: this.selectedRole()!,
          brandName: brandName || undefined,
          bio: bio || undefined,
          location: location || undefined
        }
      }));
    }
  }
}
