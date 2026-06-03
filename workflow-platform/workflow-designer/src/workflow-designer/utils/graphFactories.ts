/**
 * Factory functions for creating new graph elements with sensible defaults.
 * Centralising creation here ensures every new node/edge has a consistent shape.
 */

import type { DesignerNode, DesignerEdge } from '../types';

let nodeCounter = 1;
let edgeCounter = 1;

const STATE_COLORS = [
  '#3B82F6', '#22C55E', '#EF4444', '#F59E0B',
  '#8B5CF6', '#06B6D4', '#EC4899', '#64748B',
];

/** Create a new blank StateNode. */
export function createStateNode(position: { x: number; y: number }): DesignerNode {
  const id    = `state-${Date.now()}-${nodeCounter++}`;
  const color = STATE_COLORS[nodeCounter % STATE_COLORS.length];

  return {
    id,
    type: 'state',
    position,
    data: {
      key:       `state_${nodeCounter}`,
      label:     `State ${nodeCounter}`,
      color,
      icon:      'circle',
      isInitial: false,
      isFinal:   false,
      sortOrder: nodeCounter,
    },
  };
}

/** Create a new blank TransitionEdge between two nodes. */
export function createTransitionEdge(
  sourceNodeId: string,
  targetNodeId: string,
  fromStateKey: string,
  toStateKey:   string
): DesignerEdge {
  const id = `edge-${Date.now()}-${edgeCounter++}`;

  return {
    id,
    source:   sourceNodeId,
    target:   targetNodeId,
    type:     'transition',
    label:    'transition',
    animated: false,
    data: {
      key:                `transition_${edgeCounter}`,
      label:              'New Transition',
      fromStateKey,
      toStateKey,
      requiredPermission: '',
      uiVariant:          'default',
      sortOrder:          edgeCounter,
      conditions:         [],
      actions:            [],
    },
  };
}
