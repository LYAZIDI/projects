import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { MatStepperModule } from '@angular/material/stepper';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { loadStripe, Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { CartService } from '../../core/services/cart.service';
import { OrderService, PaymentIntentResponse } from '../../core/services/order.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink, CurrencyPipe,
    MatStepperModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatDividerModule
  ],
  template: `
    <div class="page-container checkout-page">
      <h1>Checkout</h1>

      @if (cartService.cartItems().length === 0) {
        <div class="empty">
          <p>Your cart is empty.</p>
          <a mat-raised-button color="primary" routerLink="/products">Continue Shopping</a>
        </div>
      } @else {
        <div class="checkout-layout">

          <!-- LEFT: Steps -->
          <div class="checkout-form">
            <mat-stepper [linear]="true" #stepper>

              <!-- STEP 1: Shipping -->
              <mat-step [stepControl]="shippingForm" label="Shipping Address">
                <form [formGroup]="shippingForm" class="step-form">
                  <div class="row-2">
                    <mat-form-field appearance="outline">
                      <mat-label>First Name</mat-label>
                      <input matInput formControlName="firstName">
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Last Name</mat-label>
                      <input matInput formControlName="lastName">
                    </mat-form-field>
                  </div>
                  <mat-form-field appearance="outline">
                    <mat-label>Email</mat-label>
                    <input matInput type="email" formControlName="email">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Phone (optional)</mat-label>
                    <input matInput formControlName="phone">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Address</mat-label>
                    <input matInput formControlName="address1">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Apartment, suite, etc. (optional)</mat-label>
                    <input matInput formControlName="address2">
                  </mat-form-field>
                  <div class="row-3">
                    <mat-form-field appearance="outline">
                      <mat-label>City</mat-label>
                      <input matInput formControlName="city">
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>State</mat-label>
                      <input matInput formControlName="state">
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>ZIP Code</mat-label>
                      <input matInput formControlName="zip">
                    </mat-form-field>
                  </div>
                  <mat-form-field appearance="outline">
                    <mat-label>Country</mat-label>
                    <mat-select formControlName="country">
                      <mat-option value="US">United States</mat-option>
                      <mat-option value="FR">France</mat-option>
                      <mat-option value="GB">United Kingdom</mat-option>
                      <mat-option value="DE">Germany</mat-option>
                      <mat-option value="CA">Canada</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <div class="step-actions">
                    <button mat-raised-button color="primary"
                            [disabled]="shippingForm.invalid"
                            (click)="onShippingSubmit(stepper)">
                      Continue to Payment
                    </button>
                  </div>
                </form>
              </mat-step>

              <!-- STEP 2: Payment -->
              <mat-step label="Payment">
                <div class="step-form">
                  @if (loadingIntent()) {
                    <div class="loading-stripe">
                      <mat-spinner diameter="32" />
                      <span>Initializing secure payment...</span>
                    </div>
                  }

                  <!-- Stripe Payment Element mounts here -->
                  <div id="payment-element" class="stripe-element-container"></div>

                  @if (paymentError()) {
                    <div class="error-msg">
                      <mat-icon>error</mat-icon>
                      {{ paymentError() }}
                    </div>
                  }

                  <div class="step-actions">
                    <button mat-stroked-button matStepperPrevious>Back</button>
                    <button mat-raised-button color="primary"
                            [disabled]="processingPayment() || loadingIntent()"
                            (click)="confirmPayment()">
                      @if (processingPayment()) {
                        <mat-spinner diameter="20" style="display:inline-block" />
                        Processing...
                      } @else {
                        Pay {{ intentResponse()?.total | currency:intentResponse()?.currency }}
                      }
                    </button>
                  </div>
                </div>
              </mat-step>

              <!-- STEP 3: Confirmation -->
              <mat-step label="Confirmation">
                <div class="confirmation">
                  <mat-icon class="success-icon">check_circle</mat-icon>
                  <h2>Order Placed!</h2>
                  <p>Order number: <strong>{{ intentResponse()?.orderNumber }}</strong></p>
                  <p>A confirmation will be sent to <strong>{{ shippingForm.value.email }}</strong></p>
                  <div class="conf-actions">
                    <a mat-raised-button color="primary" routerLink="/account/orders">View My Orders</a>
                    <a mat-stroked-button routerLink="/products">Continue Shopping</a>
                  </div>
                </div>
              </mat-step>

            </mat-stepper>
          </div>

          <!-- RIGHT: Order Summary -->
          <div class="order-summary card">
            <h2>Order Summary</h2>
            <mat-divider style="margin: 12px 0" />

            @for (item of cartService.cartItems(); track item.productId) {
              <div class="summary-item">
                <div class="item-info">
                  <span class="item-qty">{{ item.quantity }}×</span>
                  <div>
                    <p>{{ item.title }}</p>
                    @if (item.variantTitle) { <small>{{ item.variantTitle }}</small> }
                  </div>
                </div>
                <span>{{ item.price * item.quantity | currency }}</span>
              </div>
            }

            <mat-divider style="margin: 12px 0" />
            <div class="summary-row"><span>Subtotal</span><span>{{ cartService.subtotal() | currency }}</span></div>
            <div class="summary-row"><span>Tax (8%)</span><span>{{ cartService.subtotal() * 0.08 | currency }}</span></div>
            <div class="summary-row"><span>Shipping</span><span>Free</span></div>
            <mat-divider style="margin: 12px 0" />
            <div class="summary-row total">
              <span>Total</span>
              <span>{{ cartService.subtotal() * 1.08 | currency }}</span>
            </div>
          </div>

        </div>
      }
    </div>
  `,
  styles: [`
    .checkout-page { padding: 32px 24px; }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 24px; }
    .checkout-layout { display: grid; grid-template-columns: 1fr 360px; gap: 32px; align-items: start; }
    .checkout-form { background: white; border-radius: 8px; border: 1px solid var(--border); padding: 24px; }
    .step-form { display: flex; flex-direction: column; gap: 8px; padding-top: 16px; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .row-3 { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 8px; }
    .step-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px; }
    .stripe-element-container { border: 1px solid var(--border); border-radius: 8px; padding: 16px; min-height: 48px; margin: 8px 0; }
    .loading-stripe { display: flex; align-items: center; gap: 12px; padding: 16px 0; color: var(--text-secondary); }
    .error-msg { display: flex; align-items: center; gap: 8px; color: var(--warn); padding: 8px; background: #fff3f3; border-radius: 4px; }
    .confirmation { text-align: center; padding: 32px 16px;
      .success-icon { font-size: 64px; width: 64px; height: 64px; color: var(--success); }
      h2 { font-size: 24px; font-weight: 700; margin: 16px 0 8px; }
      p { color: var(--text-secondary); margin-bottom: 8px; }
      .conf-actions { display: flex; gap: 12px; justify-content: center; margin-top: 24px; }
    }
    .order-summary { padding: 24px; h2 { font-size: 18px; font-weight: 600; } }
    .summary-item { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;
      .item-info { display: flex; gap: 8px; .item-qty { color: var(--text-secondary); font-weight: 600; } small { color: var(--text-secondary); } }
    }
    .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; color: var(--text-secondary); }
    .summary-row.total { font-weight: 700; font-size: 16px; color: var(--text-primary); }
    .empty { text-align: center; padding: 80px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
  `]
})
export class CheckoutComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  cartService = inject(CartService);
  private orderService = inject(OrderService);

  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private paymentElement: StripePaymentElement | null = null;

  loadingIntent = signal(false);
  processingPayment = signal(false);
  paymentError = signal<string | null>(null);
  intentResponse = signal<PaymentIntentResponse | null>(null);

  shippingForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    address1: ['', Validators.required],
    address2: [''],
    city: ['', Validators.required],
    state: ['', Validators.required],
    zip: ['', Validators.required],
    country: ['US', Validators.required]
  });

  async ngOnInit() {
    this.stripe = await loadStripe(environment.stripePublishableKey);
  }

  async onShippingSubmit(stepper: any) {
    if (this.shippingForm.invalid) return;

    this.loadingIntent.set(true);
    this.paymentError.set(null);

    const request = this.orderService.buildCheckoutRequest(
      this.cartService.cartItems(),
      this.shippingForm.value
    );

    this.orderService.createPaymentIntent(request).subscribe({
      next: async (response) => {
        this.intentResponse.set(response);
        stepper.next();
        await this.mountStripeElements(response.clientSecret);
        this.loadingIntent.set(false);
      },
      error: (err) => {
        this.paymentError.set(err.error?.message || 'Failed to initialize payment. Please try again.');
        this.loadingIntent.set(false);
      }
    });
  }

  private async mountStripeElements(clientSecret: string) {
    if (!this.stripe) return;

    this.elements = this.stripe.elements({ clientSecret, appearance: { theme: 'stripe' } });
    this.paymentElement = this.elements.create('payment');

    // Wait for DOM to render the step
    setTimeout(() => {
      this.paymentElement!.mount('#payment-element');
    }, 300);
  }

  async confirmPayment() {
    if (!this.stripe || !this.elements) return;

    this.processingPayment.set(true);
    this.paymentError.set(null);

    const { error } = await this.stripe.confirmPayment({
      elements: this.elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
        payment_method_data: {
          billing_details: {
            name: `${this.shippingForm.value.firstName} ${this.shippingForm.value.lastName}`,
            email: this.shippingForm.value.email ?? undefined,
            address: {
              line1: this.shippingForm.value.address1 ?? undefined,
              city: this.shippingForm.value.city ?? undefined,
              state: this.shippingForm.value.state ?? undefined,
              postal_code: this.shippingForm.value.zip ?? undefined,
              country: this.shippingForm.value.country ?? undefined,
            }
          }
        }
      },
      redirect: 'if_required'
    });

    if (error) {
      this.paymentError.set(error.message ?? 'Payment failed. Please try again.');
      this.processingPayment.set(false);
    } else {
      // Payment succeeded
      this.cartService.clearCart();
      this.processingPayment.set(false);
      // Move to confirmation step
      document.querySelector<HTMLElement>('.mat-stepper-next')?.click();
    }
  }
}
