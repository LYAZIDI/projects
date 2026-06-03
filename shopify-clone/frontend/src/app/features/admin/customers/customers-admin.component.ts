import { Component } from '@angular/core';

@Component({
  selector: 'app-customers-admin',
  standalone: true,
  template: `
    <div class="page-container" style="padding: 32px 24px">
      <h1>Customers</h1>
      <p style="color: var(--text-secondary); margin-top: 16px">
        Customer management will be implemented here.
      </p>
    </div>
  `,
  styles: [`h1 { font-size: 28px; font-weight: 700; }`]
})
export class CustomersAdminComponent {}
