/**
 * graphToApi — React Flow graph  →  backend DTO
 *
 * Transforms DesignerNodes + DesignerEdges back into an ApiWorkflowDefinition
 * that can be POST/PUT to the REST API.
 *
 * Responsibilities:
 * - Map node.data → ApiWorkflowState (re-using backend id when available)
 * - Map edge.data → ApiWorkflowTransition
 * - Assign sortOrder from node/edge order in the arrays
 * - Strip React Flow runtime fields (selected, dragging, positionAbsolute…)
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

export function graphToApi(
  meta: DesignerMeta,
  nodes: DesignerNode[],
  edges: DesignerEdge[]
): ApiWorkflowDefinition {

  // ── States ────────────────────────────────────────────────────────────────

  const states: ApiWorkflowState[] = nodes.map((node, idx) => ({
    // Preserve the backend id for updates; omit for new nodes (let backend assign)
    id:        isBackendId(node.id) ? node.id : undefined,
    key:       node.data.key,
    label:     node.data.label,
    color:     node.data.color,
    icon:      node.data.icon,
    isInitial: node.data.isInitial,
    isFinal:   node.data.isFinal,
    sortOrder: node.data.sortOrder ?? idx,
  }));

  // Reverse lookup: nodeId → stateKey (for edge source/target resolution)
  const nodeIdToKey = new Map(nodes.map(n => [n.id, n.data.key]));

  // ── Transitions ───────────────────────────────────────────────────────────

  const transitions: ApiWorkflowTransition[] = edges
    .map((edge, idx) => {
      const fromKey = nodeIdToKey.get(edge.source) ?? edge.data?.fromStateKey ?? '';
      const toKey   = nodeIdToKey.get(edge.target) ?? edge.data?.toStateKey   ?? '';

      if (!fromKey || !toKey) {
        console.warn(
          `[graphToApi] Edge "${edge.id}" has unresolvable endpoints. Skipped.`
        );
        return null;
      }

      return {
        id:                 isBackendId(edge.id) ? edge.id : undefined,
        key:                edge.data?.key        ?? `t_${idx}`,
        label:              edge.data?.label       ?? '',
        fromStateKey:       fromKey,
        toStateKey:         toKey,
        requiredPermission: edge.data?.requiredPermission ?? '',
        uiVariant:          edge.data?.uiVariant   ?? 'default',
        sortOrder:          edge.data?.sortOrder   ?? idx,
        conditions:         (edge.data?.conditions ?? []).map((c, ci) => ({
          ...c,
          sortOrder: ci,
        })),
        actions:            (edge.data?.actions ?? []).map((a, ai) => ({
          ...a,
          sortOrder: ai,
        })),
      } satisfies ApiWorkflowTransition;
    })
    .filter((t): t is ApiWorkflowTransition => t !== null);

  // ── Definition ────────────────────────────────────────────────────────────

  return {
    id:          meta.definitionId,
    tenantId:    meta.tenantId,
    entityType:  meta.entityType,
    version:     meta.version,
    label:       meta.label,
    description: meta.description,
    active:      meta.active,
    states,
    transitions,
  };
}

/**
 * Heuristic: a React Flow id created by our factories starts with "state-" or "edge-".
 * A real backend UUID has no such prefix.
 */
function isBackendId(id: string): boolean {
  return !id.startsWith('state-') && !id.startsWith('edge-');
}
