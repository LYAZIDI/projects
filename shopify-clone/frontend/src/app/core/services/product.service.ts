import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Product {
  id: number; title: string; description: string;
  price: number; compareAtPrice?: number; inventory: number;
  slug: string; status: string; vendor?: string;
  images: ProductImage[]; variants: ProductVariant[];
  tags: string[]; storeId: number; createdAt: string;
}
export interface ProductImage { id: number; url: string; altText?: string; position: number; }
export interface ProductVariant {
  id: number; title: string; price: number;
  option1?: string; option2?: string; option3?: string;
  sku?: string; inventory: number;
}
export interface PageResponse<T> {
  content: T[]; totalElements: number; totalPages: number;
  page: number; size: number;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/products`;

  getProducts(page = 0, size = 12, sort = 'createdAt,desc'): Observable<PageResponse<Product>> {
    const params = new HttpParams().set('page', page).set('size', size).set('sort', sort);
    return this.http.get<PageResponse<Product>>(this.baseUrl, { params });
  }

  getProductBySlug(slug: string): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/${slug}`);
  }

  searchProducts(query: string, page = 0, size = 12): Observable<PageResponse<Product>> {
    const params = new HttpParams().set('q', query).set('page', page).set('size', size);
    return this.http.get<PageResponse<Product>>(`${this.baseUrl}/search`, { params });
  }

  // Admin methods
  createProduct(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(this.baseUrl, product);
  }

  updateProduct(id: number, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.baseUrl}/${id}`, product);
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
