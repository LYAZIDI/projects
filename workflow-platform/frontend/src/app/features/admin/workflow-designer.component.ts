import {
  Component, OnInit, signal, computed, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';

import {
  WorkflowService,
  WorkflowDefinition,
  WorkflowStateModel,
  WorkflowTransitionModel,
} from '../../core/workflow/workflow.service';

/**
 * Workflow Designer — admin read-only view of all workflow definitions.
 *
 * Shows each definition with its states (as chips) and transitions (as a table).
 * Requires PERM_WORKFLOW_READ (enforced by route guard + @PreAuthorize on API).
 *
 * A full drag-and-drop designer (create/edit definitions) would extend this
 * component — the read-only introspection view is the foundation.
 */
@Component({
  selector: 'app-workflow-designer',
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
    MatDividerModule,
    MatBadgeModule,
  ],
  template: `
    <div class="wf-designer">
      <h2>Workflow Designer</h2>
      <p class="subtitle">Read-only view of active workflow definitions for this tenant.</p>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }

      @for (def of definitions(); track def.id) {
        <mat-card class="wf-card">
          <mat-card-header>
            <mat-card-title>
              {{ def.label }}
              <mat-chip [highlighted]="def.active" color="primary" style="margin-left:8px">
                v{{ def.version }}
              </mat-chip>
            </mat-card-title>
            <mat-card-subtitle>
              Entity type: <strong>{{ def.entityType }}</strong>
              @if (def.description) { — {{ def.description }} }
            </mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <!-- States -->
            <h4>States</h4>
            <div class="wf-states">
              @for (s of sortedStates(def); track s.id) {
                <mat-chip
                  [style.background]="s.color"
                  style="color:white"
                  [matBadge]="s.isInitial ? 'S' : (s.isFinal ? 'F' : null)"
                  matBadgeColor="accent"
                >
                  {{ s.label }}
                </mat-chip>
              }
            </div>

            <mat-divider style="margin: 12px 0" />

            <!-- Transitions -->
            <h4>Transitions</h4>
            <table mat-table [dataSource]="sortedTransitions(def)" class="wf-trans-table">
              <ng-container matColumnDef="key">
                <th mat-header-cell *matHeaderCellDef>Key</th>
                <td mat-cell *matCellDef="let t"><code>{{ t.key }}</code></td>
              </ng-container>
              <ng-container matColumnDef="label">
                <th mat-header-cell *matHeaderCellDef>Label</th>
                <td mat-cell *matCellDef="let t">{{ t.label }}</td>
              </ng-container>
              <ng-container matColumnDef="from">
                <th mat-header-cell *matHeaderCellDef>From</th>
                <td mat-cell *matCellDef="let t">{{ t.fromStateKey }}</td>
              </ng-container>
              <ng-container matColumnDef="to">
                <th mat-header-cell *matHeaderCellDef>To</th>
                <td mat-cell *matCellDef="let t">{{ t.toStateKey }}</td>
              </ng-container>
              <ng-container matColumnDef="permission">
                <th mat-header-cell *matHeaderCellDef>Required Permission</th>
                <td mat-cell *matCellDef="let t">
                  <code>{{ t.requiredPermission || '—' }}</code>
                </td>
              </ng-container>
              <ng-container matColumnDef="variant">
                <th mat-header-cell *matHeaderCellDef>UI Variant</th>
                <td mat-cell *matCellDef="let t">{{ t.uiVariant }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="transColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: transColumns;"></tr>
            </table>
          </mat-card-content>
        </mat-card>
      }

      @if (!loading() && definitions().length === 0) {
        <p>No workflow definitions found for this tenant.</p>
      }
    </div>
  `,
  styles: [`
    .wf-designer { padding: 24px; max-width: 1100px; margin: 0 auto; }
    .subtitle     { color: #757575; margin-bottom: 24px; }
    .wf-card      { margin-bottom: 24px; }
    .wf-states    { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
    .wf-trans-table { width: 100%; }
    h4            { font-size: 14px; font-weight: 600; margin: 8px 0 4px; }
  `],
})
export class WorkflowDesignerComponent implements OnInit {
  definitions = signal<WorkflowDefinition[]>([]);
  loading     = signal(true);
  transColumns = ['key', 'label', 'from', 'to', 'permission', 'variant'];

  private wf = inject(WorkflowService);

  ngOnInit() {
    this.wf.listDefinitions().subscribe({
      next: defs => { this.definitions.set(defs); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
  }

  sortedStates(def: WorkflowDefinition): WorkflowStateModel[] {
    return [...def.states].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  sortedTransitions(def: WorkflowDefinition): WorkflowTransitionModel[] {
    return [...def.transitions].sort((a, b) => a.sortOrder - b.sortOrder);
  }
}
