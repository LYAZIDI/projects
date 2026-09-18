import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MarketplaceService, MarketplaceProduct, CustomizedProduct, RevenueStats } from './marketplace.service';
import { environment } from '../../../environments/environment';

describe('MarketplaceService', () => {
  let service: MarketplaceService;
  let httpMock: HttpTestingController;
  const base = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MarketplaceService]
    });
    service = TestBed.inject(MarketplaceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getMarketplaceProducts', () => {
    it('should GET with default page/size query params', () => {
      service.getMarketplaceProducts().subscribe(res => {
        expect(res).toEqual({ content: [] });
      });

      const req = httpMock.expectOne(`${base}/marketplace/products?page=0&size=12`);
      expect(req.request.method).toBe('GET');
      req.flush({ content: [] });
    });

    it('should GET with custom page/size query params', () => {
      service.getMarketplaceProducts(2, 24).subscribe();

      const req = httpMock.expectOne(`${base}/marketplace/products?page=2&size=24`);
      expect(req.request.method).toBe('GET');
      req.flush({ content: [] });
    });
  });

  describe('getArtisans', () => {
    it('should GET the artisans list with pagination params', () => {
      service.getArtisans(1, 5).subscribe();

      const req = httpMock.expectOne(`${base}/marketplace/artisans?page=1&size=5`);
      expect(req.request.method).toBe('GET');
      req.flush({ content: [] });
    });
  });

  describe('getArtisanProducts', () => {
    it('should GET products for a given artisan id', () => {
      const mockProducts: MarketplaceProduct[] = [{
        id: 1, title: 'Bag', slug: 'bag', description: 'desc',
        price: 200, wholesalePrice: 150, vendor: 'Atelier X', images: []
      }];

      service.getArtisanProducts(42).subscribe(res => {
        expect(res).toEqual(mockProducts);
      });

      const req = httpMock.expectOne(`${base}/marketplace/artisans/42/products`);
      expect(req.request.method).toBe('GET');
      req.flush(mockProducts);
    });
  });

  describe('search', () => {
    it('should GET with the query string appended', () => {
      service.search('wallet').subscribe();

      const req = httpMock.expectOne(`${base}/marketplace/search?q=wallet`);
      expect(req.request.method).toBe('GET');
      req.flush({ content: [] });
    });
  });

  describe('customizeProduct', () => {
    it('should POST branding customization body for the given base product id', () => {
      const body = { merchantBrand: 'MyBrand', labelType: 'PRIVATE' };
      const mockResponse: CustomizedProduct = {
        id: 5, title: 'Custom Bag', slug: 'custom-bag', description: 'desc',
        retailPrice: 300, wholesalePrice: 200, artisanBrand: 'Atelier X',
        merchantBrand: 'MyBrand', images: [], published: false
      };

      service.customizeProduct(7, body).subscribe(res => {
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${base}/branding/customize/7`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });
  });

  describe('getMerchantProducts', () => {
    it('should GET the merchant products with fixed pagination', () => {
      service.getMerchantProducts().subscribe();

      const req = httpMock.expectOne(`${base}/branding/my-products?page=0&size=50`);
      expect(req.request.method).toBe('GET');
      req.flush({ content: [] });
    });
  });

  describe('publishProduct / unpublishProduct', () => {
    it('should PATCH publish with an empty body', () => {
      service.publishProduct(9).subscribe();

      const req = httpMock.expectOne(`${base}/branding/my-products/9/publish`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({});
      req.flush({});
    });

    it('should PATCH unpublish with an empty body', () => {
      service.unpublishProduct(9).subscribe();

      const req = httpMock.expectOne(`${base}/branding/my-products/9/unpublish`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({});
      req.flush({});
    });
  });

  describe('stats and commissions', () => {
    it('should GET artisan stats', () => {
      const stats: RevenueStats = { name: 'Atelier X', totalRevenue: 1000, totalOrders: 20, rating: 4.5, reviewCount: 10 };
      service.getArtisanStats().subscribe(res => expect(res).toEqual(stats));

      const req = httpMock.expectOne(`${base}/commissions/artisan/stats`);
      expect(req.request.method).toBe('GET');
      req.flush(stats);
    });

    it('should GET merchant stats', () => {
      service.getMerchantStats().subscribe();
      const req = httpMock.expectOne(`${base}/commissions/merchant/stats`);
      expect(req.request.method).toBe('GET');
      req.flush({});
    });

    it('should GET paginated artisan commissions', () => {
      service.getArtisanCommissions(1, 20).subscribe();
      const req = httpMock.expectOne(`${base}/commissions/artisan?page=1&size=20`);
      expect(req.request.method).toBe('GET');
      req.flush({ content: [] });
    });

    it('should GET paginated merchant commissions with defaults', () => {
      service.getMerchantCommissions().subscribe();
      const req = httpMock.expectOne(`${base}/commissions/merchant?page=0&size=10`);
      expect(req.request.method).toBe('GET');
      req.flush({ content: [] });
    });

    it('should GET platform revenue as a number', () => {
      service.getPlatformRevenue().subscribe(res => expect(res).toBe(5000));
      const req = httpMock.expectOne(`${base}/commissions/platform/revenue`);
      expect(req.request.method).toBe('GET');
      req.flush(5000);
    });
  });

  it('should propagate a 404 error for a missing artisan on getArtisanProducts', () => {
    let status: number | undefined;
    service.getArtisanProducts(999).subscribe({
      next: () => fail('expected error'),
      error: (err) => status = err.status
    });

    const req = httpMock.expectOne(`${base}/marketplace/artisans/999/products`);
    req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });
    expect(status).toBe(404);
  });
});
