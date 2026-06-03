import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { reducers } from './store/app.state';
import { AuthEffects } from './store/auth/auth.effects';
import { ProductEffects } from './store/product/product.effects';
import { CartEffects } from './store/cart/cart.effects';
import { OrderEffects } from './store/order/order.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideAnimations(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideStore(reducers),
    provideEffects([AuthEffects, ProductEffects, CartEffects, OrderEffects]),
    provideStoreDevtools({ maxAge: 25, logOnly: false }),
  ]
};
