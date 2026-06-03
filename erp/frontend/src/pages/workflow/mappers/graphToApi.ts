import type { DesignerNode, DesignerEdge, DesignerMeta } from '../types';

export interface ErpDefinitionPayload {
  name: string;
  entityType: string;
  version: number;
  description?: string;
  states: {
    key: string;
    label: string;
    color?: string;
    isInitial: boolean;
    isFinal: boolean;
    sortOrder: number;
  }[];
  transitions: {
    key: string;
    label: string;
    fromStateKey: string;
    toStateKey: string;
    requiredPermission?: string;
    uiVariant: string;
    sortOrder: number;
    conditions: { type: string; config: Record<string, unknown>; sortOrder: number }[];
    actions: { type: string; config: Record<string, unknown>; sortOrder: number }[];
  }[];
}

export function graphToApi(
  nodes: DesignerNode[],
  edges: DesignerEdge[],
  meta: DesignerMeta
): ErpDefinitionPayload {
  const states = nodes.map((n, i) => ({
    key: n.data.key,
    label: n.data.label,
    color: n.data.color,
    isInitial: n.data.isInitial,
    isFinal: n.data.isFinal,
    sortOrder: n.data.sortOrder ?? i,
  }));

  const transitions = edges.map((e, i) => ({
    key: e.data?.key || `t_${i}`,
    label: e.data?.label || '',
    fromStateKey: e.data?.fromStateKey || '',
    toStateKey: e.data?.toStateKey || '',
    requiredPermission: e.data?.requiredPermission || undefined,
    uiVariant: e.data?.uiVariant || 'default',
    sortOrder: e.data?.sortOrder ?? i,
    conditions: (e.data?.conditions || []).map((c, ci) => ({
      type: c.type,
      config: c.config,
      sortOrder: c.sortOrder ?? ci,
    })),
    actions: (e.data?.actions || []).map((a, ai) => ({
      type: a.type,
      config: a.config,
      sortOrder: a.sortOrder ?? ai,
    })),
  }));

  return {
    name: meta.label,          // designer "label" → ERP "name"
    entityType: meta.entityType,
    version: meta.version,
    description: meta.description || undefined,
    states,
    transitions,
  };
}
