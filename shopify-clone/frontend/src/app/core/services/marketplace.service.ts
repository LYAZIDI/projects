import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ArtisanProfile {
  id: number;
  brandName: string;
  bio: string;
  location: string;
  specialties: string[];
  verified: boolean;
  rating: number;
  reviewCount: number;
  totalSales: number;
}

export interface CustomizedProduct {
  id: number;
  title: string;
  slug: string;
  description: string;
  retailPrice: number;
  wholesalePrice: number;
  artisanBrand: string;
  merchantBrand: string;
  merchantLogoUrl?: string;
  labelType?: string;
  images: { url: string }[];
  published: boolean;
}

export interface MarketplaceProduct {
  id: number;
  title: string;
  slug: string;
  description: string;
  price: number;
  wholesalePrice: number;
  vendor: string;
  artisanBrand?: string; // alias of vendor for marketplace display
  images: { url: string; altText?: string }[];
}

export interface RevenueStats {
  name: string;
  totalRevenue: number;
  totalOrders: number;
  rating: number;
  reviewCount: number;
}

@Injectable({ providedIn: 'root' })
export class MarketplaceService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ── Public marketplace ──────────────────────────────────────────────
  getMarketplaceProducts(page = 0, size = 12): Observable<any> {
    return this.http.get(`${this.base}/marketplace/products?page=${page}&size=${size}`);
  }

  getArtisans(page = 0, size = 12): Observable<any> {
    return this.http.get(`${this.base}/marketplace/artisans?page=${page}&size=${size}`);
  }

  getArtisanProducts(artisanId: number): Observable<MarketplaceProduct[]> {
    return this.http.get<MarketplaceProduct[]>(`${this.base}/marketplace/artisans/${artisanId}/products`);
  }

  search(query: string): Observable<any> {
    return this.http.get(`${this.base}/marketplace/search?q=${query}`);
  }

  // ── Branding / Merchant ─────────────────────────────────────────────
  customizeProduct(baseProductId: number, body: any): Observable<CustomizedProduct> {
    return this.http.post<CustomizedProduct>(`${this.base}/branding/customize/${baseProductId}`, body);
  }

  getMerchantProducts(): Observable<any> {
    return this.http.get<any>(`${this.base}/branding/my-products?page=0&size=50`);
  }

  publishProduct(id: number): Observable<CustomizedProduct> {
    return this.http.patch<CustomizedProduct>(`${this.base}/branding/my-products/${id}/publish`, {});
  }

  unpublishProduct(id: number): Observable<CustomizedProduct> {
    return this.http.patch<CustomizedProduct>(`${this.base}/branding/my-products/${id}/unpublish`, {});
  }

  // ── Commission / Stats ──────────────────────────────────────────────
  getArtisanStats(): Observable<RevenueStats> {
    return this.http.get<RevenueStats>(`${this.base}/commissions/artisan/stats`);
  }

  getMerchantStats(): Observable<RevenueStats> {
    return this.http.get<RevenueStats>(`${this.base}/commissions/merchant/stats`);
  }

  getArtisanCommissions(page = 0, size = 10): Observable<any> {
    return this.http.get(`${this.base}/commissions/artisan?page=${page}&size=${size}`);
  }

  getMerchantCommissions(page = 0, size = 10): Observable<any> {
    return this.http.get(`${this.base}/commissions/merchant?page=${page}&size=${size}`);
  }

  getPlatformRevenue(): Observable<number> {
    return this.http.get<number>(`${this.base}/commissions/platform/revenue`);
  }
}
