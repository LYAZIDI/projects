import { TestBed } from '@angular/core/testing';
import { CartService } from './cart.service';
import { Product, ProductVariant } from './product.service';

describe('CartService', () => {
  let service: CartService;

  const baseProduct: Product = {
    id: 1,
    title: 'Leather Wallet',
    description: 'A fine wallet',
    price: 100,
    inventory: 10,
    slug: 'leather-wallet',
    status: 'ACTIVE',
    images: [{ id: 1, url: 'wallet.png', position: 0 }],
    variants: [],
    tags: [],
    storeId: 1,
    createdAt: '2026-01-01'
  };

  const variant: ProductVariant = {
    id: 10,
    title: 'Brown',
    price: 120,
    inventory: 5
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CartService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created with an empty cart when storage is empty', () => {
    expect(service).toBeTruthy();
    expect(service.cartItems()).toEqual([]);
    expect(service.itemCount()).toBe(0);
    expect(service.subtotal()).toBe(0);
  });

  it('should load existing cart items from localStorage on construction', () => {
    localStorage.setItem('cart', JSON.stringify([
      { productId: 1, title: 'Existing', price: 50, quantity: 2 }
    ]));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const freshService = TestBed.inject(CartService);

    expect(freshService.cartItems().length).toBe(1);
    expect(freshService.cartItems()[0].title).toBe('Existing');
  });

  describe('addItem', () => {
    it('should add a new item using product price when no variant given', () => {
      service.addItem(baseProduct, undefined, 2);

      const items = service.cartItems();
      expect(items.length).toBe(1);
      expect(items[0]).toEqual(jasmine.objectContaining({
        productId: 1,
        variantId: undefined,
        title: 'Leather Wallet',
        price: 100,
        quantity: 2,
        imageUrl: 'wallet.png'
      }));
    });

    it('should use the variant price and title when a variant is given', () => {
      service.addItem(baseProduct, variant, 1);

      const items = service.cartItems();
      expect(items[0]).toEqual(jasmine.objectContaining({
        productId: 1,
        variantId: 10,
        variantTitle: 'Brown',
        price: 120,
        quantity: 1
      }));
    });

    it('should persist the cart to localStorage after adding', () => {
      service.addItem(baseProduct, undefined, 1);
      const stored = JSON.parse(localStorage.getItem('cart')!);
      expect(stored.length).toBe(1);
      expect(stored[0].productId).toBe(1);
    });

    it('should increase quantity instead of duplicating when the same product/variant is added again', () => {
      service.addItem(baseProduct, variant, 1);
      service.addItem(baseProduct, variant, 3);

      const items = service.cartItems();
      expect(items.length).toBe(1);
      expect(items[0].quantity).toBe(4);
    });

    it('should treat the same product with a different variant as a distinct line item', () => {
      const variant2: ProductVariant = { id: 20, title: 'Black', price: 130, inventory: 3 };
      service.addItem(baseProduct, variant, 1);
      service.addItem(baseProduct, variant2, 1);

      expect(service.cartItems().length).toBe(2);
    });

    it('should handle a product with no images gracefully', () => {
      const noImageProduct: Product = { ...baseProduct, images: [] };
      service.addItem(noImageProduct, undefined, 1);
      expect(service.cartItems()[0].imageUrl).toBeUndefined();
    });
  });

  describe('updateQuantity', () => {
    beforeEach(() => {
      service.addItem(baseProduct, variant, 2);
    });

    it('should update the quantity of the matching item', () => {
      service.updateQuantity(1, 10, 5);
      expect(service.cartItems()[0].quantity).toBe(5);
    });

    it('should persist the updated quantity to localStorage', () => {
      service.updateQuantity(1, 10, 5);
      const stored = JSON.parse(localStorage.getItem('cart')!);
      expect(stored[0].quantity).toBe(5);
    });

    it('should remove the item when the new quantity is zero or less', () => {
      service.updateQuantity(1, 10, 0);
      expect(service.cartItems().length).toBe(0);
    });

    it('should remove the item when the new quantity is negative', () => {
      service.updateQuantity(1, 10, -1);
      expect(service.cartItems().length).toBe(0);
    });

    it('should not affect items with a different productId/variantId', () => {
      service.addItem(baseProduct, undefined, 1);
      service.updateQuantity(1, 10, 9);

      const noVariantItem = service.cartItems().find(i => i.variantId === undefined);
      expect(noVariantItem?.quantity).toBe(1);
    });
  });

  describe('removeItem', () => {
    it('should remove the matching item from the cart', () => {
      service.addItem(baseProduct, variant, 1);
      service.removeItem(1, 10);
      expect(service.cartItems().length).toBe(0);
    });

    it('should persist the removal to localStorage', () => {
      service.addItem(baseProduct, variant, 1);
      service.removeItem(1, 10);
      const stored = JSON.parse(localStorage.getItem('cart')!);
      expect(stored.length).toBe(0);
    });

    it('should only remove the item matching both productId and variantId', () => {
      service.addItem(baseProduct, undefined, 1);
      service.addItem(baseProduct, variant, 1);
      service.removeItem(1, undefined);

      const items = service.cartItems();
      expect(items.length).toBe(1);
      expect(items[0].variantId).toBe(10);
    });
  });

  describe('clearCart', () => {
    it('should empty the cart and remove it from localStorage', () => {
      service.addItem(baseProduct, variant, 1);
      service.clearCart();

      expect(service.cartItems()).toEqual([]);
      expect(localStorage.getItem('cart')).toBeNull();
    });
  });

  describe('computed signals', () => {
    it('itemCount should sum quantities across all items', () => {
      service.addItem(baseProduct, undefined, 2);
      service.addItem(baseProduct, variant, 3);
      expect(service.itemCount()).toBe(5);
    });

    it('subtotal should sum price * quantity across all items', () => {
      service.addItem(baseProduct, undefined, 2); // 100 * 2 = 200
      service.addItem(baseProduct, variant, 1);   // 120 * 1 = 120
      expect(service.subtotal()).toBe(320);
    });
  });
});
