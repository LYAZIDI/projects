/**
 * useWorkflowValidation — real-time graph validation.
 *
 * Rules enforced:
 *   ERROR   – no initial state defined
 *   ERROR   – more than one initial state
 *   ERROR   – transition has empty key
 *   ERROR   – two transitions share the same key within a definition
 *   ERROR   – transition references a state key that doesn't exist as a node
 *   WARNING – state is unreachable (no incoming edges, not initial)
 *   WARNING – state is a dead end (no outgoing edges, not final)
 *   WARNING – self-loop on a final state
 *   INFO    – definition has no final states defined
 *
 * validate() is pure — it does not mutate the store itself.
 * The hook wraps it so callers get the result AND the store is updated.
 */

import { useCallback } from 'react';
import { useWorkflowDesignerStore } from '../store/workflowDesignerStore';
import type { DesignerNode, DesignerEdge, ValidationIssue } from '../types';

let issueCounter = 0;
const id = () => `v${issueCounter++}`;

export function validate(
  nodes: DesignerNode[],
  edges: DesignerEdge[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const stateKeys = new Set(nodes.map(n => n.data.key));
  const initialNodes = nodes.filter(n => n.data.isInitial);
  const finalNodes   = nodes.filter(n => n.data.isFinal);

  // ── Initial state rules ───────────────────────────────────────────────────

  if (initialNodes.length === 0) {
    issues.push({
      id: id(), severity: 'error',
      message: 'No initial state defined. Mark exactly one state as initial.',
    });
  }

  if (initialNodes.length > 1) {
    initialNodes.slice(1).forEach(n =>
      issues.push({
        id: id(), severity: 'error',
        elementId: n.id,
        message: `"${n.data.label}" cannot be initial — "${initialNodes[0].data.label}" is already marked initial.`,
      })
    );
  }

  // ── Final state info ──────────────────────────────────────────────────────

  if (finalNodes.length === 0 && nodes.length > 0) {
    issues.push({
      id: id(), severity: 'info',
      message: 'No terminal states defined. Consider marking at least one state as final.',
    });
  }

  // ── Transition validation ─────────────────────────────────────────────────

  const seenKeys = new Map<string, string>(); // key → edgeId

  edges.forEach(edge => {
    const key = edge.data?.key ?? '';

    // Empty key
    if (!key.trim()) {
      issues.push({
        id: id(), severity: 'error', elementId: edge.id,
        message: `Transition from "${edge.data?.fromStateKey}" has an empty key.`,
      });
    } else {
      // Duplicate key
      if (seenKeys.has(key)) {
        issues.push({
          id: id(), severity: 'error', elementId: edge.id,
          message: `Duplicate transition key "${key}". Keys must be unique within a definition.`,
        });
      } else {
        seenKeys.set(key, edge.id);
      }
    }

    // Orphaned state references (should not happen via UI, but possible on import)
    if (!stateKeys.has(edge.data?.fromStateKey ?? '')) {
      issues.push({
        id: id(), severity: 'error', elementId: edge.id,
        message: `Transition "${key}" references unknown fromState "${edge.data?.fromStateKey}".`,
      });
    }
    if (!stateKeys.has(edge.data?.toStateKey ?? '')) {
      issues.push({
        id: id(), severity: 'error', elementId: edge.id,
        message: `Transition "${key}" references unknown toState "${edge.data?.toStateKey}".`,
      });
    }
  });

  // ── Reachability warnings ─────────────────────────────────────────────────

  const outgoing = new Set(edges.map(e => e.source));
  const incoming = new Set(edges.map(e => e.target));

  nodes.forEach(node => {
    if (!node.data.isInitial && !incoming.has(node.id)) {
      issues.push({
        id: id(), severity: 'warning', elementId: node.id,
        message: `State "${node.data.label}" is unreachable (no incoming transitions, not initial).`,
      });
    }
    if (!node.data.isFinal && !outgoing.has(node.id) && nodes.length > 1) {
      issues.push({
        id: id(), severity: 'warning', elementId: node.id,
        message: `State "${node.data.label}" is a dead end (no outgoing transitions, not marked final).`,
      });
    }
  });

  // Self-loop on a final state
  edges.filter(e => e.source === e.target).forEach(e => {
    const node = nodes.find(n => n.id === e.source);
    if (node?.data.isFinal) {
      issues.push({
        id: id(), severity: 'warning', elementId: e.id,
        message: `Self-loop on terminal state "${node.data.label}" — it will never be reached again.`,
      });
    }
  });

  return issues;
}

/** Hook wrapper: runs validation and syncs result into the Zustand store. */
export function useValidation() {
  const setIssues = useWorkflowDesignerStore(s => s.setValidationIssues);

  const runValidation = useCallback(
    (nodes: DesignerNode[], edges: DesignerEdge[]) => {
      const issues = validate(nodes, edges);
      setIssues(issues);
      return issues;
    },
    [setIssues]
  );

  return { validate: runValidation };
}
