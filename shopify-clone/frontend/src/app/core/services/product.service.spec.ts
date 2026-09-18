import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProductService, Product, PageResponse } from './product.service';
import { environment } from '../../../environments/environment';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/products`;

  const mockProduct: Product = {
    id: 1, title: 'Wallet', description: 'A fine wallet', price: 100,
    inventory: 10, slug: 'wallet', status: 'ACTIVE',
    images: [], variants: [], tags: [], storeId: 1, createdAt: '2026-01-01'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProductService]
    });
    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getProducts', () => {
    it('should GET with default page, size and sort params', () => {
      const pageResponse: PageResponse<Product> = {
        content: [mockProduct], totalElements: 1, totalPages: 1, page: 0, size: 12
      };

      service.getProducts().subscribe(res => {
        expect(res).toEqual(pageResponse);
      });

      const req = httpMock.expectOne(
        r => r.url === baseUrl &&
          r.params.get('page') === '0' &&
          r.params.get('size') === '12' &&
          r.params.get('sort') === 'createdAt,desc'
      );
      expect(req.request.method).toBe('GET');
      req.flush(pageResponse);
    });

    it('should GET with custom page, size and sort params', () => {
      service.getProducts(2, 24, 'price,asc').subscribe();

      const req = httpMock.expectOne(
        r => r.url === baseUrl &&
          r.params.get('page') === '2' &&
          r.params.get('size') === '24' &&
          r.params.get('sort') === 'price,asc'
      );
      expect(req.request.method).toBe('GET');
      req.flush({ content: [], totalElements: 0, totalPages: 0, page: 2, size: 24 });
    });
  });

  describe('getProductBySlug', () => {
    it('should GET a product by its slug', () => {
      service.getProductBySlug('wallet').subscribe(res => {
        expect(res).toEqual(mockProduct);
      });

      const req = httpMock.expectOne(`${baseUrl}/wallet`);
      expect(req.request.method).toBe('GET');
      req.flush(mockProduct);
    });

    it('should propagate a 404 when the product does not exist', () => {
      let status: number | undefined;
      service.getProductBySlug('missing').subscribe({
        next: () => fail('expected error'),
        error: (err) => status = err.status
      });

      const req = httpMock.expectOne(`${baseUrl}/missing`);
      req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });
      expect(status).toBe(404);
    });
  });

  describe('searchProducts', () => {
    it('should GET with query, page and size params', () => {
      service.searchProducts('leather', 1, 6).subscribe();

      const req = httpMock.expectOne(
        r => r.url === `${baseUrl}/search` &&
          r.params.get('q') === 'leather' &&
          r.params.get('page') === '1' &&
          r.params.get('size') === '6'
      );
      expect(req.request.method).toBe('GET');
      req.flush({ content: [], totalElements: 0, totalPages: 0, page: 1, size: 6 });
    });

    it('should use default page/size when not provided', () => {
      service.searchProducts('bag').subscribe(res => {
        expect(res.page).toBe(0);
      });

      const req = httpMock.expectOne(
        r => r.url === `${baseUrl}/search` &&
          r.params.get('q') === 'bag' &&
          r.params.get('page') === '0' &&
          r.params.get('size') === '12'
      );
      req.flush({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 12 });
    });
  });

  describe('createProduct', () => {
    it('should POST the product payload', () => {
      const partial: Partial<Product> = { title: 'New Product', price: 50 };

      service.createProduct(partial).subscribe(res => {
        expect(res).toEqual(mockProduct);
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(partial);
      req.flush(mockProduct);
    });

    it('should propagate a 403 when the user lacks admin rights', () => {
      let status: number | undefined;
      service.createProduct({ title: 'X' }).subscribe({
        next: () => fail('expected error'),
        error: (err) => status = err.status
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
      expect(status).toBe(403);
    });
  });

  describe('updateProduct', () => {
    it('should PUT the updated product payload to the product id URL', () => {
      const partial: Partial<Product> = { title: 'Updated Title' };

      service.updateProduct(1, partial).subscribe(res => {
        expect(res).toEqual(mockProduct);
      });

      const req = httpMock.expectOne(`${baseUrl}/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(partial);
      req.flush(mockProduct);
    });
  });

  describe('deleteProduct', () => {
    it('should DELETE the product by id', () => {
      service.deleteProduct(1).subscribe(res => {
        expect(res).toBeNull();
      });

      const req = httpMock.expectOne(`${baseUrl}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should propagate an error when deletion fails', () => {
      let status: number | undefined;
      service.deleteProduct(999).subscribe({
        next: () => fail('expected error'),
        error: (err) => status = err.status
      });

      const req = httpMock.expectOne(`${baseUrl}/999`);
      req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });
      expect(status).toBe(404);
    });
  });
});
