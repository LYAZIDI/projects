import {
  Component, OnInit, signal, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { WorkflowStateWidgetComponent } from '../workflow/workflow-state-widget.component';
import { WorkflowHistoryComponent } from '../workflow/workflow-history.component';
import { TransitionResult } from '../../core/workflow/workflow.service';
import { environment } from '../../../environments/environment';

interface Lead {
  id: string;
  reference: string;
  title: string;
  status: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  lostReason: string | null;
}

/** Map of workflow state keys → badge colors (must match definition seeds) */
const STATE_COLORS: Record<string, string> = {
  open:      '#3B82F6',
  won:       '#22C55E',
  lost:      '#EF4444',
  cancelled: '#6B7280',
};

/**
 * Lead Detail page — integrates the WorkflowStateWidget and WorkflowHistory
 * to give a complete picture of a lead's current state and its full audit trail.
 */
@Component({
  selector: 'app-lead-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatDividerModule,
    MatProgressBarModule,
    WorkflowStateWidgetComponent,
    WorkflowHistoryComponent,
  ],
  template: `
    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

    @if (lead()) {
      <div class="lead-detail">
        <mat-card>
          <mat-card-header>
            <mat-card-title>{{ lead()!.title }}</mat-card-title>
            <mat-card-subtitle>{{ lead()!.reference }}</mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <div class="lead-info">
              <span><strong>Contact:</strong> {{ lead()!.contactName || '—' }}</span>
              <span><strong>Email:</strong>   {{ lead()!.contactEmail || '—' }}</span>
              @if (lead()!.lostReason) {
                <span><strong>Loss reason:</strong> {{ lead()!.lostReason }}</span>
              }
            </div>

            <mat-divider style="margin: 16px 0" />

            <!-- Dynamic workflow action bar -->
            <app-workflow-state-widget
              entityType="lead"
              [entityId]="lead()!.id"
              [currentState]="lead()!.status"
              [stateColor]="stateColor()"
              (transitioned)="onTransitioned($event)"
            />
          </mat-card-content>
        </mat-card>

        <!-- Audit trail -->
        <app-workflow-history entityType="lead" [entityId]="lead()!.id" />
      </div>
    }
  `,
  styles: [`
    .lead-detail { padding: 24px; max-width: 900px; margin: 0 auto; }
    .lead-info   { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
  `],
})
export class LeadDetailComponent implements OnInit {
  lead    = signal<Lead | null>(null);
  loading = signal(true);

  private route  = inject(ActivatedRoute);
  private http   = inject(HttpClient);

  stateColor() {
    return STATE_COLORS[this.lead()?.status ?? ''] ?? '#607D8B';
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.http.get<Lead>(`${environment.apiUrl}/crm/leads/${id}`).subscribe({
      next: lead => { this.lead.set(lead); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
  }

  onTransitioned(result: TransitionResult) {
    // Refresh lead status after transition (simple approach — could use signals/store)
    this.lead.update(l => l ? { ...l, status: result.toState } : l);
  }
}
