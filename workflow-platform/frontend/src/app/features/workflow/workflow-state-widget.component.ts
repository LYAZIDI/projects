import {
  Component, input, output, signal, computed, OnInit, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import {
  WorkflowService,
  AvailableTransition,
  TransitionResult,
} from '../../core/workflow/workflow.service';
import { WorkflowPayloadDialogComponent } from './workflow-payload-dialog.component';

/**
 * Workflow State Widget — dynamic action buttons + current state badge.
 *
 * Usage:
 * ```html
 * <app-workflow-state-widget
 *   entityType="lead"
 *   [entityId]="lead.id"
 *   [currentState]="lead.status"
 *   (transitioned)="onTransitioned($event)"
 * />
 * ```
 *
 * The widget is self-contained: it fetches available transitions on init and
 * re-fetches after each successful transition.
 */
@Component({
  selector: 'app-workflow-state-widget',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  template: `
    <div class="wf-widget">
      <!-- Current state badge -->
      <span class="wf-state-badge" [style.background]="stateColor()">
        {{ currentState() }}
      </span>

      <!-- Loading skeleton -->
      @if (loading()) {
        <mat-spinner diameter="20" />
      }

      <!-- Action buttons -->
      @if (!loading()) {
        @for (t of transitions(); track t.key) {
          <button
            [color]="buttonColor(t.uiVariant)"
            mat-stroked-button
            [disabled]="executing()"
            [matTooltip]="t.requiredPermission"
            (click)="onTransition(t)"
          >
            {{ t.label }}
          </button>
        }

        @if (transitions().length === 0 && !loading()) {
          <span class="wf-no-transitions">No transitions available</span>
        }
      }

      <!-- Executing spinner -->
      @if (executing()) {
        <mat-spinner diameter="20" />
      }
    </div>
  `,
  styles: [`
    .wf-widget {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .wf-state-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      color: white;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .wf-no-transitions {
      font-size: 12px;
      color: #9e9e9e;
      font-style: italic;
    }
  `],
})
export class WorkflowStateWidgetComponent implements OnInit {
  // ── Inputs ────────────────────────────────────────────────────────────────
  entityType = input.required<string>();
  entityId   = input.required<string>();
  currentState = input.required<string>();
  stateColor   = input<string>('#607D8B');  // overridden by parent if known

  // ── Outputs ───────────────────────────────────────────────────────────────
  transitioned = output<TransitionResult>();

  // ── State ─────────────────────────────────────────────────────────────────
  transitions = signal<AvailableTransition[]>([]);
  loading     = signal(true);
  executing   = signal(false);
  error       = signal<string | null>(null);

  private wf      = inject(WorkflowService);
  private snackBar = inject(MatSnackBar);
  private dialog   = inject(MatDialog);

  ngOnInit() {
    this.fetchTransitions();
  }

  fetchTransitions() {
    this.loading.set(true);
    this.wf.getAvailableTransitions(this.entityType(), this.entityId()).subscribe({
      next: ts => { this.transitions.set(ts); this.loading.set(false); },
      error: ()  => { this.loading.set(false); }
    });
  }

  onTransition(t: AvailableTransition) {
    // Open payload dialog only if transition name matches patterns that need extra data
    const needsPayload = ['lose', 'reject', 'cancel'].some(k => t.key.includes(k));

    if (needsPayload) {
      const dialogRef = this.dialog.open(WorkflowPayloadDialogComponent, {
        width: '400px',
        data: { transition: t },
      });
      dialogRef.afterClosed().subscribe((payload: Record<string, unknown> | null) => {
        if (payload != null) this.execute(t.key, payload);
      });
    } else {
      this.execute(t.key, {});
    }
  }

  private execute(transitionKey: string, payload: Record<string, unknown>) {
    this.executing.set(true);
    this.wf.applyTransition(this.entityType(), this.entityId(), transitionKey, payload).subscribe({
      next: result => {
        this.executing.set(false);
        this.snackBar.open(`Moved to ${result.toState}`, 'OK', { duration: 3000 });
        this.transitioned.emit(result);
        this.fetchTransitions();   // refresh available buttons
      },
      error: err => {
        this.executing.set(false);
        const detail = err.error?.detail ?? 'Transition failed';
        this.snackBar.open(detail, 'Dismiss', { duration: 5000 });
      },
    });
  }

  buttonColor(variant: string): 'primary' | 'accent' | 'warn' | undefined {
    switch (variant) {
      case 'primary':
      case 'success': return 'primary';
      case 'danger':  return 'warn';
      case 'warning': return 'accent';
      default:        return undefined;
    }
  }
}
