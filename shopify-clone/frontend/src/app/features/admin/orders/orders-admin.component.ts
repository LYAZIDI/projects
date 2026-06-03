import { Component } from '@angular/core';

@Component({
  selector: 'app-orders-admin',
  standalone: true,
  template: `
    <div class="page-container" style="padding: 32px 24px">
      <h1>Orders</h1>
      <p style="color: var(--text-secondary); margin-top: 16px">
        Order management will be implemented here.
      </p>
    </div>
  `,
  styles: [`h1 { font-size: 28px; font-weight: 700; }`]
})
export class OrdersAdminComponent {}
