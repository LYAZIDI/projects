/**
 * TransitionEdge — custom React Flow edge representing a WorkflowTransition.
 *
 * Renders:
 * - Bezier path with themed color based on uiVariant
 * - Clickable label showing the transition key
 * - Arrow marker in matching color
 * - Condition / action count badges on the label
 * - Double-click → opens TransitionEditor drawer (via store)
 */

import React, { memo, useCallback } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import type { DesignerEdge, UiVariant } from '../types';
import { useWorkflowDesignerStore } from '../store/workflowDesignerStore';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';

// Map uiVariant to a color
const VARIANT_COLORS: Record<UiVariant, string> = {
  primary: '#1976d2',
  success: '#2e7d32',
  danger:  '#c62828',
  warning: '#e65100',
  default: '#546e7a',
};

function TransitionEdgeComponent({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<DesignerEdge>) {
  const { selectEdge, ui } = useWorkflowDesignerStore();
  const readOnly = ui.readOnly;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const color = VARIANT_COLORS[(data?.uiVariant as UiVariant) ?? 'default'];
  const strokeWidth = selected ? 2.5 : 1.5;

  const handleLabelClick = useCallback(() => {
    if (!readOnly) selectEdge(id);
  }, [id, selectEdge, readOnly]);

  const condCount = data?.conditions?.length ?? 0;
  const actCount  = data?.actions?.length ?? 0;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth,
          filter: selected ? `drop-shadow(0 0 4px ${color}80)` : undefined,
        }}
      />

      {/* Label rendered via portal to escape SVG coordinate system */}
      <EdgeLabelRenderer>
        <Box
          onDoubleClick={handleLabelClick}
          onClick={handleLabelClick}
          sx={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            cursor: readOnly ? 'default' : 'pointer',
          }}
        >
          <Box
            sx={{
              background: selected ? color : 'white',
              color: selected ? 'white' : color,
              border: `1.5px solid ${color}`,
              borderRadius: 1,
              px: 0.75,
              py: 0.25,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              boxShadow: selected ? `0 2px 8px ${color}50` : '0 1px 4px #0001',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            {data?.label || data?.key || id}

            {/* Condition count badge */}
            {condCount > 0 && (
              <Chip
                label={`${condCount}C`}
                size="small"
                sx={{
                  height: 14,
                  fontSize: 9,
                  fontWeight: 700,
                  background: selected ? 'rgba(255,255,255,0.25)' : '#fff3e0',
                  color: selected ? 'white' : '#e65100',
                  '& .MuiChip-label': { px: 0.5 },
                }}
              />
            )}

            {/* Action count badge */}
            {actCount > 0 && (
              <Chip
                label={`${actCount}A`}
                size="small"
                sx={{
                  height: 14,
                  fontSize: 9,
                  fontWeight: 700,
                  background: selected ? 'rgba(255,255,255,0.25)' : '#e8f5e9',
                  color: selected ? 'white' : '#2e7d32',
                  '& .MuiChip-label': { px: 0.5 },
                }}
              />
            )}
          </Box>
        </Box>
      </EdgeLabelRenderer>
    </>
  );
}

export const TransitionEdge = memo(TransitionEdgeComponent);
