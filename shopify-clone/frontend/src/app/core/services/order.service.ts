import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CartItem } from './cart.service';

export interface CheckoutRequest {
  firstName: string; lastName: string; email: string;
  address1: string; address2?: string; city: string;
  state: string; zip: string; country: string; phone?: string;
  items: CartItemRequest[];
  currency: string;
}
export interface CartItemRequest {
  productId: number; variantId?: number;
  title: string; variantTitle?: string;
  quantity: number; price: number;
}
export interface PaymentIntentResponse {
  clientSecret: string; paymentIntentId: string;
  orderNumber: string; total: number; currency: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);

  createPaymentIntent(request: CheckoutRequest): Observable<PaymentIntentResponse> {
    return this.http.post<PaymentIntentResponse>(`${environment.apiUrl}/payments/create-intent`, request);
  }

  getOrder(orderNumber: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/orders/${orderNumber}`);
  }

  buildCheckoutRequest(items: CartItem[], form: any): CheckoutRequest {
    return {
      ...form,
      currency: 'USD',
      items: items.map(i => ({
        productId: i.productId,
        variantId: i.variantId,
        title: i.title,
        variantTitle: i.variantTitle,
        quantity: i.quantity,
        price: i.price
      }))
    };
  }
}
