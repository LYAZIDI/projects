import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OrderTrackingService, Order, PageResponse } from './order-tracking.service';
import { environment } from '../../../environments/environment';

describe('OrderTrackingService', () => {
  let service: OrderTrackingService;
  let httpMock: HttpTestingController;

  const mockOrder: Order = {
    id: 1,
    orderNumber: 'ORD-001',
    status: 'SHIPPED',
    paymentStatus: 'PAID',
    items: [],
    subtotal: 100,
    taxTotal: 8,
    shippingTotal: 0,
    discountTotal: 0,
    total: 108,
    currency: 'USD',
    shippingFirstName: 'Jane',
    shippingLastName: 'Doe',
    shippingAddress1: '123 Main St',
    shippingCity: 'Lyon',
    shippingState: 'RA',
    shippingZip: '69000',
    shippingCountry: 'FR',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OrderTrackingService]
    });
    service = TestBed.inject(OrderTrackingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getMyOrders', () => {
    it('should GET the orders endpoint with default page/size params', () => {
      const pageResponse: PageResponse<Order> = {
        content: [mockOrder], totalElements: 1, totalPages: 1, number: 0, size: 10
      };

      service.getMyOrders().subscribe(res => {
        expect(res).toEqual(pageResponse);
      });

      const req = httpMock.expectOne(
        r => r.url === `${environment.apiUrl}/orders` &&
          r.params.get('page') === '0' &&
          r.params.get('size') === '10'
      );
      expect(req.request.method).toBe('GET');
      req.flush(pageResponse);
    });

    it('should GET the orders endpoint with custom page/size params', () => {
      service.getMyOrders(3, 5).subscribe();

      const req = httpMock.expectOne(
        r => r.url === `${environment.apiUrl}/orders` &&
          r.params.get('page') === '3' &&
          r.params.get('size') === '5'
      );
      expect(req.request.method).toBe('GET');
      req.flush({ content: [], totalElements: 0, totalPages: 0, number: 3, size: 5 });
    });

    it('should propagate an error when the request fails', () => {
      let status: number | undefined;
      service.getMyOrders().subscribe({
        next: () => fail('expected error'),
        error: (err) => status = err.status
      });

      const req = httpMock.expectOne(r => r.url === `${environment.apiUrl}/orders`);
      req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
      expect(status).toBe(401);
    });
  });

  describe('getOrder', () => {
    it('should GET a single order by order number', () => {
      service.getOrder('ORD-001').subscribe(res => {
        expect(res).toEqual(mockOrder);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/orders/ORD-001`);
      expect(req.request.method).toBe('GET');
      req.flush(mockOrder);
    });

    it('should propagate a 404 when the order does not exist', () => {
      let status: number | undefined;
      service.getOrder('MISSING').subscribe({
        next: () => fail('expected error'),
        error: (err) => status = err.status
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/orders/MISSING`);
      req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });
      expect(status).toBe(404);
    });
  });
});
