/**
 * apiToGraph — backend DTO  →  React Flow graph
 *
 * Transforms an ApiWorkflowDefinition fetched from the REST API
 * into DesignerNodes + DesignerEdges that React Flow can render.
 *
 * Responsibilities:
 * - Assign stable React Flow node/edge ids (we use the backend id when available)
 * - Compute an automatic layout (dagre-style grid) when no saved positions exist
 * - Preserve all domain data verbatim inside the node/edge `.data` bags
 *
 * This function is PURE — no side effects, no API calls.
 */

import type {
  ApiWorkflowDefinition,
  ApiWorkflowState,
  ApiWorkflowTransition,
  DesignerNode,
  DesignerEdge,
  DesignerMeta,
} from '../types';

// ── Layout constants ──────────────────────────────────────────────────────────

const NODE_WIDTH  = 180;
const NODE_HEIGHT = 60;
const H_GAP       = 80;
const V_GAP       = 100;
const COLS        = 3;

/** Naïve grid layout — assign (x, y) when the backend has no saved positions. */
function autoLayout(states: ApiWorkflowState[]): Map<string, { x: number; y: number }> {
  const sorted = [...states].sort((a, b) => {
    // Initial state first, final states last
    if (a.isInitial) return -1;
    if (b.isInitial) return 1;
    if (a.isFinal && !b.isFinal) return 1;
    if (!a.isFinal && b.isFinal) return -1;
    return a.sortOrder - b.sortOrder;
  });

  const map = new Map<string, { x: number; y: number }>();
  sorted.forEach((state, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    map.set(state.key, {
      x: col * (NODE_WIDTH + H_GAP) + 50,
      y: row * (NODE_HEIGHT + V_GAP) + 80,
    });
  });
  return map;
}

// ── Main transformer ──────────────────────────────────────────────────────────

export interface ApiToGraphResult {
  meta: DesignerMeta;
  nodes: DesignerNode[];
  edges: DesignerEdge[];
}

export function apiToGraph(def: ApiWorkflowDefinition): ApiToGraphResult {
  const meta: DesignerMeta = {
    definitionId: def.id,
    tenantId:     def.tenantId,
    entityType:   def.entityType,
    version:      def.version,
    label:        def.label,
    description:  def.description,
    active:       def.active,
  };

  const positions = autoLayout(def.states);

  // ── Nodes (states) ─────────────────────────────────────────────────────────

  const nodes: DesignerNode[] = def.states.map(state => ({
    // Use backend id when present; fall back to state key for new definitions
    id:       state.id ?? `state-${state.key}`,
    type:     'state',
    position: positions.get(state.key) ?? { x: 0, y: 0 },
    data: {
      key:       state.key,
      label:     state.label,
      color:     state.color,
      icon:      state.icon,
      isInitial: state.isInitial,
      isFinal:   state.isFinal,
      sortOrder: state.sortOrder,
    },
  }));

  // Build a reverse lookup: stateKey → nodeId (needed for edge source/target)
  const keyToNodeId = new Map(nodes.map(n => [n.data.key, n.id]));

  // ── Edges (transitions) ───────────────────────────────────────────────────

  const edges: DesignerEdge[] = def.transitions
    .map((t: ApiWorkflowTransition) => {
      const sourceId = keyToNodeId.get(t.fromStateKey);
      const targetId = keyToNodeId.get(t.toStateKey);

      if (!sourceId || !targetId) {
        console.warn(
          `[apiToGraph] Transition "${t.key}" references unknown state(s): ` +
          `${t.fromStateKey} → ${t.toStateKey}. Edge skipped.`
        );
        return null;
      }

      return {
        id:     t.id ?? `edge-${t.key}`,
        source: sourceId,
        target: targetId,
        type:   'transition',
        label:  t.label,
        data: {
          key:                t.key,
          label:              t.label,
          fromStateKey:       t.fromStateKey,
          toStateKey:         t.toStateKey,
          requiredPermission: t.requiredPermission ?? '',
          uiVariant:          t.uiVariant ?? 'default',
          sortOrder:          t.sortOrder,
          conditions:         t.conditions ?? [],
          actions:            t.actions ?? [],
        },
      } satisfies DesignerEdge;
    })
    .filter((e): e is DesignerEdge => e !== null);

  return { meta, nodes, edges };
}
