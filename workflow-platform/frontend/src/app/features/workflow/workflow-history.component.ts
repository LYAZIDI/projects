import {
  Component, input, OnChanges, signal, inject
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';

import { WorkflowService, WorkflowExecutionLog } from '../../core/workflow/workflow.service';

/**
 * Workflow History Component — immutable audit trail table.
 *
 * Usage:
 * ```html
 * <app-workflow-history entityType="lead" [entityId]="lead.id" />
 * ```
 *
 * Reloads automatically when entityId changes.
 */
@Component({
  selector: 'app-workflow-history',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatTableModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatChipsModule,
  ],
  template: `
    <div class="wf-history">
      <h3 class="wf-history__title">Workflow History</h3>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }

      @if (!loading() && logs().length === 0) {
        <p class="wf-history__empty">No transitions recorded yet.</p>
      }

      @if (!loading() && logs().length > 0) {
        <table mat-table [dataSource]="logs()" class="wf-history__table">

          <!-- Status icon -->
          <ng-container matColumnDef="success">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row">
              <mat-icon [class]="row.success ? 'icon-success' : 'icon-error'"
                        [matTooltip]="row.success ? 'Success' : row.errorCode">
                {{ row.success ? 'check_circle' : 'error' }}
              </mat-icon>
            </td>
          </ng-container>

          <!-- Transition -->
          <ng-container matColumnDef="transition">
            <th mat-header-cell *matHeaderCellDef>Transition</th>
            <td mat-cell *matCellDef="let row">
              <strong>{{ row.transitionKey }}</strong>
              <span class="wf-arrow"> → </span>
              @if (row.toStateKey) {
                <mat-chip [highlighted]="true">{{ row.toStateKey }}</mat-chip>
              }
            </td>
          </ng-container>

          <!-- From state -->
          <ng-container matColumnDef="fromState">
            <th mat-header-cell *matHeaderCellDef>From</th>
            <td mat-cell *matCellDef="let row">{{ row.fromStateKey }}</td>
          </ng-container>

          <!-- User -->
          <ng-container matColumnDef="user">
            <th mat-header-cell *matHeaderCellDef>User</th>
            <td mat-cell *matCellDef="let row">{{ row.userEmail }}</td>
          </ng-container>

          <!-- Duration -->
          <ng-container matColumnDef="duration">
            <th mat-header-cell *matHeaderCellDef>Duration</th>
            <td mat-cell *matCellDef="let row">{{ row.durationMs }} ms</td>
          </ng-container>

          <!-- Date -->
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Date</th>
            <td mat-cell *matCellDef="let row">
              {{ row.createdAt | date:'dd/MM/yy HH:mm:ss' }}
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"
              [class.wf-row-error]="!row.success"></tr>
        </table>
      }
    </div>
  `,
  styles: [`
    .wf-history { margin-top: 24px; }
    .wf-history__title { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
    .wf-history__empty { color: #9e9e9e; font-style: italic; }
    .wf-history__table { width: 100%; }
    .icon-success { color: #22C55E; }
    .icon-error   { color: #EF4444; }
    .wf-arrow     { color: #9e9e9e; margin: 0 4px; }
    .wf-row-error { background: #fff5f5; }
  `],
})
export class WorkflowHistoryComponent implements OnChanges {
  entityType = input.required<string>();
  entityId   = input.required<string>();

  columns = ['success', 'transition', 'fromState', 'user', 'duration', 'date'];
  logs    = signal<WorkflowExecutionLog[]>([]);
  loading = signal(false);

  private wf = inject(WorkflowService);

  ngOnChanges() {
    if (this.entityId()) this.load();
  }

  load() {
    this.loading.set(true);
    this.wf.getHistory(this.entityType(), this.entityId()).subscribe({
      next: logs => { this.logs.set(logs); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
  }
}
