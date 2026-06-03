/**
 * StateNode — custom React Flow node representing a WorkflowState.
 *
 * Renders:
 * - Colored header with icon + label
 * - Initial (▶) / Final (⬛) badges
 * - Connection handles (source right, target left)
 * - Selection ring + hover shadow
 * - Context menu on right-click (delete, set initial/final)
 */

import React, { memo, useCallback, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import type { StateNodeData, DesignerNode } from '../types';
import { useWorkflowDesignerStore } from '../store/workflowDesignerStore';

// MUI micro-imports to avoid loading the entire bundle
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

function StateNodeComponent({ id, data, selected }: NodeProps<DesignerNode>) {
  const { deleteNode, updateNodeData, selectNode, ui } = useWorkflowDesignerStore();
  const readOnly = ui.readOnly;

  // ── Context menu ──────────────────────────────────────────────────────────

  const [menuAnchor, setMenuAnchor] = useState<null | { x: number; y: number }>(null);

  const openMenu = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setMenuAnchor({ x: e.clientX, y: e.clientY });
  }, [readOnly]);

  const closeMenu = () => setMenuAnchor(null);

  const handleEdit = () => {
    closeMenu();
    selectNode(id);
  };

  const handleSetInitial = () => {
    updateNodeData(id, { isInitial: true, isFinal: false });
    closeMenu();
  };

  const handleSetFinal = () => {
    updateNodeData(id, { isFinal: !data.isFinal, isInitial: false });
    closeMenu();
  };

  const handleDelete = () => {
    closeMenu();
    deleteNode(id);
  };

  // ── Styles ────────────────────────────────────────────────────────────────

  const borderColor = selected ? '#1976d2' : data.color;
  const shadow      = selected
    ? `0 0 0 3px #1976d220, 0 4px 20px ${data.color}40`
    : `0 2px 8px ${data.color}30`;

  return (
    <>
      {/* Target handle (incoming transitions) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: data.color,
          width: 10,
          height: 10,
          border: '2px solid white',
        }}
      />

      {/* Node body */}
      <Box
        onContextMenu={openMenu}
        onDoubleClick={handleEdit}
        sx={{
          width: 180,
          borderRadius: 2,
          border: `2px solid ${borderColor}`,
          boxShadow: shadow,
          background: '#fff',
          overflow: 'hidden',
          cursor: readOnly ? 'default' : 'pointer',
          transition: 'box-shadow 0.15s ease',
          '&:hover': readOnly ? {} : { boxShadow: `0 0 0 2px ${data.color}60, 0 4px 16px ${data.color}40` },
        }}
      >
        {/* Colored header */}
        <Box
          sx={{
            background: data.color,
            px: 1.5,
            py: 0.75,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            minHeight: 36,
          }}
        >
          {/* Initial / Final markers */}
          {data.isInitial && (
            <PlayArrowIcon sx={{ fontSize: 14, color: 'white', opacity: 0.9 }} />
          )}
          {data.isFinal && (
            <StopIcon sx={{ fontSize: 14, color: 'white', opacity: 0.9 }} />
          )}

          <Typography
            variant="caption"
            sx={{
              color: 'white',
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: 0.3,
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {data.label}
          </Typography>
        </Box>

        {/* Key badge */}
        <Box sx={{ px: 1.5, py: 0.5, background: '#fafafa' }}>
          <Typography
            variant="caption"
            sx={{ color: '#9e9e9e', fontSize: 10, fontFamily: 'monospace' }}
          >
            {data.key}
          </Typography>
        </Box>

        {/* Badges row */}
        {(data.isInitial || data.isFinal) && (
          <Box sx={{ px: 1, pb: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {data.isInitial && (
              <Chip
                label="initial"
                size="small"
                sx={{ height: 16, fontSize: 9, background: '#e3f2fd', color: '#1565c0' }}
              />
            )}
            {data.isFinal && (
              <Chip
                label="final"
                size="small"
                sx={{ height: 16, fontSize: 9, background: '#fce4ec', color: '#b71c1c' }}
              />
            )}
          </Box>
        )}
      </Box>

      {/* Source handle (outgoing transitions) */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: data.color,
          width: 10,
          height: 10,
          border: '2px solid white',
        }}
      />

      {/* Context menu */}
      <Menu
        open={!!menuAnchor}
        onClose={closeMenu}
        anchorReference="anchorPosition"
        anchorPosition={menuAnchor ?? undefined}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit state</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleSetInitial} disabled={data.isInitial}>
          <ListItemIcon><PlayArrowIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Set as initial</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleSetFinal}>
          <ListItemIcon><StopIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{data.isFinal ? 'Unmark final' : 'Mark as final'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete state</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

export const StateNode = memo(StateNodeComponent);
