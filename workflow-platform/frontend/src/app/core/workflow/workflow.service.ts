import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AvailableTransition {
  key: string;
  label: string;
  toState: string;
  uiVariant: 'primary' | 'success' | 'danger' | 'warning' | 'default';
  requiredPermission: string;
}

export interface TransitionResult {
  success: boolean;
  fromState: string;
  toState: string;
  actionsRun: string[];
  durationMs: number;
  logId: string;
  correlationId: string;
}

export interface WorkflowExecutionLog {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  transitionKey: string;
  fromStateKey: string;
  toStateKey: string | null;
  userId: string;
  userEmail: string;
  correlationId: string;
  success: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  durationMs: number;
  actionsRun: string[];
  createdAt: string;
}

export interface WorkflowDefinition {
  id: string;
  tenantId: string;
  entityType: string;
  version: number;
  label: string;
  description: string;
  active: boolean;
  states: WorkflowStateModel[];
  transitions: WorkflowTransitionModel[];
}

export interface WorkflowStateModel {
  id: string;
  key: string;
  label: string;
  color: string;
  icon: string;
  isInitial: boolean;
  isFinal: boolean;
  sortOrder: number;
}

export interface WorkflowTransitionModel {
  id: string;
  key: string;
  label: string;
  fromStateKey: string;
  toStateKey: string;
  requiredPermission: string;
  uiVariant: string;
  sortOrder: number;
}

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private readonly base = `${environment.apiUrl}/workflow`;

  constructor(private http: HttpClient) {}

  /**
   * Apply a transition to an entity.
   * Returns the TransitionResult; throws HttpErrorResponse on failure (4xx/5xx).
   */
  applyTransition(
    entityType: string,
    entityId: string,
    transitionKey: string,
    payload: Record<string, unknown> = {}
  ): Observable<TransitionResult> {
    return this.http.post<TransitionResult>(
      `${this.base}/${entityType}/${entityId}/transition/${transitionKey}`,
      { payload }
    );
  }

  /**
   * Get the transitions available to the current user from the entity's current state.
   */
  getAvailableTransitions(entityType: string, entityId: string): Observable<AvailableTransition[]> {
    return this.http.get<AvailableTransition[]>(
      `${this.base}/${entityType}/${entityId}/transitions`
    );
  }

  /**
   * Fetch the full immutable audit trail for an entity.
   */
  getHistory(entityType: string, entityId: string): Observable<WorkflowExecutionLog[]> {
    return this.http.get<WorkflowExecutionLog[]>(
      `${this.base}/${entityType}/${entityId}/history`
    );
  }

  /**
   * List all workflow definitions for the tenant (admin only).
   */
  listDefinitions(): Observable<WorkflowDefinition[]> {
    return this.http.get<WorkflowDefinition[]>(`${this.base}/definitions`);
  }

  /**
   * Get a full definition with states and transitions.
   */
  getDefinition(id: string): Observable<WorkflowDefinition> {
    return this.http.get<WorkflowDefinition>(`${this.base}/definitions/${id}`);
  }
}
