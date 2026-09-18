import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OrderService, CheckoutRequest, PaymentIntentResponse } from './order.service';
import { CartItem } from './cart.service';
import { environment } from '../../../environments/environment';

describe('OrderService', () => {
  let service: OrderService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OrderService]
    });
    service = TestBed.inject(OrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createPaymentIntent', () => {
    it('should POST the checkout request to the create-intent endpoint', () => {
      const request: CheckoutRequest = {
        firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com',
        address1: '123 Main St', city: 'Lyon', state: 'RA', zip: '69000', country: 'FR',
        items: [{ productId: 1, title: 'Wallet', quantity: 1, price: 100 }],
        currency: 'USD'
      };
      const mockResponse: PaymentIntentResponse = {
        clientSecret: 'secret_123', paymentIntentId: 'pi_123',
        orderNumber: 'ORD-001', total: 108, currency: 'USD'
      };

      service.createPaymentIntent(request).subscribe(res => {
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/payments/create-intent`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(mockResponse);
    });

    it('should propagate an error when payment intent creation fails', () => {
      const request: CheckoutRequest = {
        firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com',
        address1: '123 Main St', city: 'Lyon', state: 'RA', zip: '69000', country: 'FR',
        items: [], currency: 'USD'
      };
      let status: number | undefined;

      service.createPaymentIntent(request).subscribe({
        next: () => fail('expected error'),
        error: (err) => status = err.status
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/payments/create-intent`);
      req.flush({ message: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });
      expect(status).toBe(500);
    });
  });

  describe('getOrder', () => {
    it('should GET the order by order number', () => {
      service.getOrder('ORD-001').subscribe(res => {
        expect(res).toEqual({ orderNumber: 'ORD-001' });
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/orders/ORD-001`);
      expect(req.request.method).toBe('GET');
      req.flush({ orderNumber: 'ORD-001' });
    });
  });

  describe('buildCheckoutRequest', () => {
    it('should merge the shipping form values with mapped cart items and USD currency', () => {
      const items: CartItem[] = [
        { productId: 1, variantId: 10, title: 'Wallet', variantTitle: 'Brown', price: 100, quantity: 2, imageUrl: 'a.png' },
        { productId: 2, title: 'Belt', price: 50, quantity: 1 }
      ];
      const form = {
        firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com',
        address1: '123 Main St', address2: '', city: 'Lyon', state: 'RA', zip: '69000',
        country: 'FR', phone: '0102030405'
      };

      const result = service.buildCheckoutRequest(items, form);

      expect(result.currency).toBe('USD');
      expect(result.firstName).toBe('Jane');
      expect(result.items).toEqual([
        { productId: 1, variantId: 10, title: 'Wallet', variantTitle: 'Brown', quantity: 2, price: 100 },
        { productId: 2, variantId: undefined, title: 'Belt', variantTitle: undefined, quantity: 1, price: 50 }
      ]);
    });

    it('should return an empty items array when cart is empty', () => {
      const result = service.buildCheckoutRequest([], { firstName: 'Jane' });
      expect(result.items).toEqual([]);
      expect(result.currency).toBe('USD');
      expect(result.firstName).toBe('Jane');
    });
  });
});
