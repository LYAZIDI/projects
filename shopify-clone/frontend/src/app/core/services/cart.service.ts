import { Injectable, signal, computed } from '@angular/core';
import { Product, ProductVariant } from './product.service';

export interface CartItem {
  productId: number;
  variantId?: number;
  title: string;
  variantTitle?: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private items = signal<CartItem[]>(this.loadFromStorage());

  readonly cartItems = this.items.asReadonly();

  readonly itemCount = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly subtotal = computed(() =>
    this.items().reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  addItem(product: Product, variant?: ProductVariant, quantity = 1): void {
    const variantId = variant?.id;
    const existing = this.items().find(
      i => i.productId === product.id && i.variantId === variantId
    );

    if (existing) {
      this.updateQuantity(product.id, variantId, existing.quantity + quantity);
    } else {
      this.items.update(items => [...items, {
        productId: product.id,
        variantId,
        title: product.title,
        variantTitle: variant?.title,
        price: variant?.price ?? product.price,
        quantity,
        imageUrl: product.images[0]?.url
      }]);
      this.saveToStorage();
    }
  }

  updateQuantity(productId: number, variantId: number | undefined, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId, variantId);
      return;
    }
    this.items.update(items =>
      items.map(item =>
        item.productId === productId && item.variantId === variantId
          ? { ...item, quantity }
          : item
      )
    );
    this.saveToStorage();
  }

  removeItem(productId: number, variantId?: number): void {
    this.items.update(items =>
      items.filter(item => !(item.productId === productId && item.variantId === variantId))
    );
    this.saveToStorage();
  }

  clearCart(): void {
    this.items.set([]);
    localStorage.removeItem('cart');
  }

  private saveToStorage(): void {
    localStorage.setItem('cart', JSON.stringify(this.items()));
  }

  private loadFromStorage(): CartItem[] {
    const stored = localStorage.getItem('cart');
    return stored ? JSON.parse(stored) : [];
  }
}
