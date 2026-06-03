/**
 * Core domain types for the Workflow Designer.
 *
 * These types mirror the backend WorkflowDefinition model exactly,
 * plus React Flow–specific graph types (GraphNode, GraphEdge).
 *
 * The mapper layer (apiToGraph / graphToApi) is the ONLY place that
 * translates between the two representations. All other code uses
 * either ApiWorkflowDefinition (persistence) or DesignerGraph (UI).
 */

// ────────────────────────────────────────────────────────────────────────────
// Backend API DTOs  (mirrors Java model 1-to-1)
// ────────────────────────────────────────────────────────────────────────────

export interface ApiConditionConfig {
  id?: string;
  type: string;          // e.g. "field_not_empty" | "payload_field_not_empty"
  config: Record<string, unknown>;
  sortOrder: number;
}

export interface ApiActionConfig {
  id?: string;
  type: string;          // e.g. "set_field" | "emit_event" | "copy_payload_field"
  config: Record<string, unknown>;
  sortOrder: number;
}

export interface ApiWorkflowState {
  id?: string;
  key: string;
  label: string;
  color: string;
  icon: string;
  isInitial: boolean;
  isFinal: boolean;
  sortOrder: number;
}

export interface ApiWorkflowTransition {
  id?: string;
  key: string;
  label: string;
  fromStateKey: string;
  toStateKey: string;
  requiredPermission: string;
  uiVariant: UiVariant;
  sortOrder: number;
  conditions: ApiConditionConfig[];
  actions: ApiActionConfig[];
}

export interface ApiWorkflowDefinition {
  id?: string;
  tenantId: string;
  entityType: string;
  version: number;
  label: string;
  description: string;
  active: boolean;
  states: ApiWorkflowState[];
  transitions: ApiWorkflowTransition[];
}

// ────────────────────────────────────────────────────────────────────────────
// UI types  (React Flow nodes and edges + designer metadata)
// ────────────────────────────────────────────────────────────────────────────

export type UiVariant = 'primary' | 'success' | 'danger' | 'warning' | 'default';

/** Data carried inside a React Flow Node (a WorkflowState). */
export interface StateNodeData {
  /** The workflow state key (unique within a definition, used in transitions). */
  key: string;
  label: string;
  color: string;
  icon: string;
  isInitial: boolean;
  isFinal: boolean;
  sortOrder: number;
  /** Used by the canvas to render selected/hover states. */
  selected?: boolean;
}

/** Data carried inside a React Flow Edge (a WorkflowTransition). */
export interface TransitionEdgeData {
  key: string;
  label: string;
  fromStateKey: string;
  toStateKey: string;
  requiredPermission: string;
  uiVariant: UiVariant;
  sortOrder: number;
  conditions: ApiConditionConfig[];
  actions: ApiActionConfig[];
}

/**
 * The full graph model used by the designer store.
 * React Flow's Node/Edge generics are parameterized with our data types.
 */
export interface DesignerGraph {
  nodes: DesignerNode[];
  edges: DesignerEdge[];
}

// React Flow types re-exported with our generics for convenience
import type { Node, Edge } from '@xyflow/react';

export type DesignerNode = Node<StateNodeData, 'state'>;
export type DesignerEdge = Edge<TransitionEdgeData>;

// ────────────────────────────────────────────────────────────────────────────
// Designer meta (loaded alongside the graph)
// ────────────────────────────────────────────────────────────────────────────

export interface DesignerMeta {
  definitionId: string | undefined;
  tenantId: string;
  entityType: string;
  version: number;
  label: string;
  description: string;
  active: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// Validation
// ────────────────────────────────────────────────────────────────────────────

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  message: string;
  /** nodeId or edgeId this issue applies to (optional — for highlighting) */
  elementId?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Available built-in condition / action types (for form dropdowns)
// ────────────────────────────────────────────────────────────────────────────

export interface ConditionTypeDef {
  type: string;
  label: string;
  description: string;
  configSchema: ConfigField[];
}

export interface ActionTypeDef {
  type: string;
  label: string;
  description: string;
  configSchema: ConfigField[];
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'string' | 'select' | 'boolean';
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export const BUILT_IN_CONDITIONS: ConditionTypeDef[] = [
  {
    type: 'field_not_empty',
    label: 'Field not empty',
    description: 'Entity field must have a non-null, non-empty value',
    configSchema: [{ key: 'field', label: 'Field name', type: 'string', required: true }],
  },
  {
    type: 'payload_field_not_empty',
    label: 'Payload field not empty',
    description: 'Transition request payload must contain a non-empty field',
    configSchema: [{ key: 'field', label: 'Payload field', type: 'string', required: true }],
  },
  {
    type: 'field_comparison',
    label: 'Field comparison',
    description: 'Entity field compared to a literal value',
    configSchema: [
      { key: 'field', label: 'Field', type: 'string', required: true },
      {
        key: 'operator', label: 'Operator', type: 'select', required: true,
        options: [
          { value: 'eq', label: 'equals (=)' },
          { value: 'ne', label: 'not equals (≠)' },
          { value: 'gt', label: 'greater than (>)' },
          { value: 'gte', label: 'greater or equal (≥)' },
          { value: 'lt', label: 'less than (<)' },
          { value: 'lte', label: 'less or equal (≤)' },
        ],
      },
      { key: 'value', label: 'Value', type: 'string', required: true },
    ],
  },
  {
    type: 'role_check',
    label: 'Role check',
    description: 'Current user must have a specific role',
    configSchema: [{ key: 'role', label: 'Role name', type: 'string', required: true }],
  },
];

export const BUILT_IN_ACTIONS: ActionTypeDef[] = [
  {
    type: 'set_field',
    label: 'Set field',
    description: 'Set an entity or context field. Supports __NOW__, __USER_ID__, __USER_EMAIL__',
    configSchema: [
      { key: 'field', label: 'Field name', type: 'string', required: true },
      { key: 'value', label: 'Value (or magic token)', type: 'string', required: true,
        placeholder: '__NOW__ | __USER_ID__ | literal' },
    ],
  },
  {
    type: 'copy_payload_field',
    label: 'Copy payload field',
    description: 'Copy a value from the request payload into the execution context',
    configSchema: [
      { key: 'from', label: 'From (payload key)', type: 'string', required: true },
      { key: 'to', label: 'To (context key)', type: 'string', required: true },
    ],
  },
  {
    type: 'emit_event',
    label: 'Emit event',
    description: 'Annotate the context with an event type published after commit',
    configSchema: [
      { key: 'eventType', label: 'Event type', type: 'string', required: true,
        placeholder: 'lead.won | quote.sent | …' },
    ],
  },
];
