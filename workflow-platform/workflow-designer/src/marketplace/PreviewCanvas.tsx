/**
 * PreviewCanvas — a read-only React Flow visualization of a WorkflowDefinitionSnapshot.
 *
 * Used in the marketplace template detail page to let users inspect the workflow
 * graph before installing it.
 *
 * Key design decisions:
 * - Uses the same StateNode and TransitionEdge custom types as the designer
 *   so the preview is visually identical to the editor canvas.
 * - All interactions (drag, connect, edit) are disabled — purely informational.
 * - Auto-layout is computed via the same grid algorithm as apiToGraph.ts.
 * - Accepts a WorkflowDefinitionSnapshot (marketplace type), not an ApiWorkflowDefinition.
 */

import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { StateNode } from '../workflow-designer/components/StateNode';
import { TransitionEdge } from '../workflow-designer/components/TransitionEdge';
import type { WorkflowDefinitionSnapshot, StateSnapshot, TransitionSnapshot } from '../api/marketplaceApi';
import type { DesignerNode, DesignerEdge } from '../workflow-designer/types';

// ── Custom type registries (same as designer, but declared separately to avoid
//    React Flow's "nodeTypes changed" warning on every render) ─────────────────

const nodeTypes: NodeTypes = { state: StateNode };
const edgeTypes: EdgeTypes = { transition: TransitionEdge };

// ── Layout helpers ────────────────────────────────────────────────────────────

const NODE_WIDTH  = 180;
const NODE_HEIGHT = 60;
const H_GAP       = 80;
const V_GAP       = 100;
const COLS        = 3;

function autoLayout(states: StateSnapshot[]): Map<string, { x: number; y: number }> {
  const sorted = [...states].sort((a, b) => {
    if (a.isInitial && !b.isInitial) return -1;
    if (!a.isInitial && b.isInitial) return 1;
    if (a.isFinal && !b.isFinal) return 1;
    if (!a.isFinal && b.isFinal) return -1;
    return a.sortOrder - b.sortOrder;
  });
  const map = new Map<string, { x: number; y: number }>();
  sorted.forEach((s, i) => {
    map.set(s.key, {
      x: (i % COLS) * (NODE_WIDTH + H_GAP) + 40,
      y: Math.floor(i / COLS) * (NODE_HEIGHT + V_GAP) + 60,
    });
  });
  return map;
}

// ── Snapshot → React Flow graph ───────────────────────────────────────────────

function snapshotToGraph(snapshot: WorkflowDefinitionSnapshot): {
  nodes: DesignerNode[];
  edges: DesignerEdge[];
} {
  const positions = autoLayout(snapshot.states);

  const nodes: DesignerNode[] = snapshot.states.map((s, i) => ({
    id:       `node-${s.key}`,
    type:     'state',
    position: positions.get(s.key) ?? { x: i * 260, y: 80 },
    draggable: false,
    selectable: false,
    data: {
      key:       s.key,
      label:     s.label,
      color:     s.color,
      icon:      s.icon,
      isInitial: s.isInitial,
      isFinal:   s.isFinal,
      sortOrder: s.sortOrder,
    },
  }));

  const keyToId = new Map(nodes.map(n => [n.data.key, n.id]));

  const edges: DesignerEdge[] = snapshot.transitions
    .map((t: TransitionSnapshot, i) => {
      const src = keyToId.get(t.fromStateKey);
      const tgt = keyToId.get(t.toStateKey);
      if (!src || !tgt) return null;
      return {
        id:     `edge-${t.key}-${i}`,
        source: src,
        target: tgt,
        type:   'transition',
        label:  t.label,
        selectable: false,
        data: {
          key:                t.key,
          label:              t.label,
          fromStateKey:       t.fromStateKey,
          toStateKey:         t.toStateKey,
          requiredPermission: t.requiredPermission ?? '',
          uiVariant:          (t.uiVariant ?? 'default') as any,
          sortOrder:          t.sortOrder,
          conditions:         t.conditions ?? [],
          actions:            t.actions ?? [],
        },
      } satisfies DesignerEdge;
    })
    .filter((e): e is DesignerEdge => e !== null);

  return { nodes, edges };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  snapshot: WorkflowDefinitionSnapshot;
  height?: number;
}

export function PreviewCanvas({ snapshot, height = 360 }: Props) {
  const { nodes, edges } = useMemo(
    () => snapshotToGraph(snapshot),
    [snapshot]
  );

  if (nodes.length === 0) {
    return (
      <Box
        sx={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          borderRadius: 2,
          border: '1px dashed #e2e8f0',
        }}
      >
        <Typography color="text.secondary">No states defined in this template.</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height,
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        background: '#fafbfc',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={true}
        zoomOnScroll={true}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultEdgeOptions={{
          type: 'transition',
          markerEnd: { type: 'arrowclosed' },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e0e0e0" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => (n.data as any)?.color ?? '#9e9e9e'}
          maskColor="rgba(240,240,240,0.6)"
          style={{ border: '1px solid #e0e0e0' }}
        />
      </ReactFlow>
    </Box>
  );
}
