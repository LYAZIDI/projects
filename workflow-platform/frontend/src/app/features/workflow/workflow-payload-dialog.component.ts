import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AvailableTransition } from '../../core/workflow/workflow.service';

interface DialogData {
  transition: AvailableTransition;
}

/**
 * Generic payload dialog for transitions that require extra user input
 * (e.g., lostReason, rejectionReason).
 *
 * The dialog returns a {@code Record<string, unknown>} matching the
 * expected payload keys, or null if the user cancels.
 */
@Component({
  selector: 'app-workflow-payload-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.transition.label }}</h2>

    <mat-dialog-content>
      @if (reasonField()) {
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>{{ reasonLabel() }}</mat-label>
          <textarea matInput [(ngModel)]="reasonValue" rows="3" required></textarea>
        </mat-form-field>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-flat-button color="primary"
              [disabled]="reasonField() && !reasonValue.trim()"
              (click)="confirm()">
        Confirm
      </button>
    </mat-dialog-actions>
  `,
})
export class WorkflowPayloadDialogComponent {
  data: DialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<WorkflowPayloadDialogComponent>);

  reasonValue = '';

  reasonField(): boolean {
    const key = this.data.transition.key;
    return key.includes('lose') || key.includes('reject') || key.includes('cancel');
  }

  reasonLabel(): string {
    const key = this.data.transition.key;
    if (key.includes('lose'))   return 'Loss Reason';
    if (key.includes('reject')) return 'Rejection Reason';
    return 'Reason';
  }

  reasonKey(): string {
    const key = this.data.transition.key;
    if (key.includes('lose'))   return 'lostReason';
    if (key.includes('reject')) return 'rejectionReason';
    return 'reason';
  }

  cancel()  { this.dialogRef.close(null); }

  confirm() {
    const payload: Record<string, unknown> = {};
    if (this.reasonField() && this.reasonValue.trim()) {
      payload[this.reasonKey()] = this.reasonValue.trim();
    }
    this.dialogRef.close(payload);
  }
}
