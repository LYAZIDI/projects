/**
 * StateEditor — right-side drawer for editing a WorkflowState.
 *
 * Opens when a node is double-clicked or selected via context menu.
 * Changes are applied immediately to the Zustand store (live preview on canvas).
 * No save button — the global "Save" action in the toolbar persists to the API.
 */

import React, { useEffect, useState } from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';

import {
  useWorkflowDesignerStore,
  selectedNode,
} from '../store/workflowDesignerStore';
import type { StateNodeData } from '../types';

// A small swatch picker — avoids pulling in a full color library
const SWATCHES = [
  '#3B82F6', '#22C55E', '#EF4444', '#F59E0B',
  '#8B5CF6', '#06B6D4', '#EC4899', '#64748B',
  '#0F172A', '#D97706', '#047857', '#7C3AED',
];

export function StateEditor() {
  const store   = useWorkflowDesignerStore();
  const node    = useWorkflowDesignerStore(selectedNode);
  const open    = !!node;
  const readOnly = store.ui.readOnly;

  // Local copy so edits are buffered and sent all at once to avoid excessive re-renders
  const [draft, setDraft] = useState<Partial<StateNodeData>>({});

  useEffect(() => {
    if (node) {
      setDraft({
        key:       node.data.key,
        label:     node.data.label,
        color:     node.data.color,
        icon:      node.data.icon,
        isInitial: node.data.isInitial,
        isFinal:   node.data.isFinal,
      });
    }
  }, [node?.id]);   // reset when a different node is selected

  if (!node) return null;

  const commit = (partial: Partial<StateNodeData>) => {
    const updated = { ...draft, ...partial };
    setDraft(updated);
    store.updateNodeData(node.id, updated);
  };

  const close = () => store.selectNode(null);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={close}
      variant="persistent"
      PaperProps={{
        sx: {
          width: 320,
          top: 64,   // below the toolbar
          height: 'calc(100% - 64px)',
          boxShadow: '-4px 0 16px #0001',
          overflow: 'hidden auto',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2, py: 1.5,
          display: 'flex', alignItems: 'center',
          background: draft.color ?? '#607D8B',
          color: 'white',
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} flex={1}>
          Edit State
        </Typography>
        {!readOnly && (
          <Tooltip title="Delete state">
            <IconButton
              size="small"
              sx={{ color: 'white', mr: 0.5 }}
              onClick={() => { store.deleteNode(node.id); }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <IconButton size="small" sx={{ color: 'white' }} onClick={close}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Label */}
        <TextField
          label="Label"
          value={draft.label ?? ''}
          onChange={e => commit({ label: e.target.value })}
          fullWidth
          size="small"
          disabled={readOnly}
          helperText="Human-readable name shown on the node"
        />

        {/* Key */}
        <TextField
          label="State key"
          value={draft.key ?? ''}
          onChange={e => commit({ key: e.target.value.replace(/\s+/g, '_').toLowerCase() })}
          fullWidth
          size="small"
          disabled={readOnly}
          inputProps={{ style: { fontFamily: 'monospace' } }}
          helperText="Unique identifier used in transitions and code (snake_case)"
        />

        {/* Icon (material icon name) */}
        <TextField
          label="Icon name"
          value={draft.icon ?? ''}
          onChange={e => commit({ icon: e.target.value })}
          fullWidth
          size="small"
          disabled={readOnly}
          helperText='Material icon name, e.g. "circle", "check_circle"'
        />

        <Divider />

        {/* Color picker */}
        <Box>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Color
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
            {SWATCHES.map(c => (
              <Box
                key={c}
                onClick={() => !readOnly && commit({ color: c })}
                sx={{
                  width: 28, height: 28,
                  borderRadius: '50%',
                  background: c,
                  cursor: readOnly ? 'default' : 'pointer',
                  border: draft.color === c ? '3px solid #1976d2' : '2px solid transparent',
                  outline: draft.color === c ? '2px solid white' : 'none',
                  outlineOffset: -4,
                  transition: 'transform 0.1s',
                  '&:hover': readOnly ? {} : { transform: 'scale(1.15)' },
                }}
              />
            ))}
            {/* Custom hex input */}
            <TextField
              value={draft.color ?? ''}
              onChange={e => commit({ color: e.target.value })}
              size="small"
              disabled={readOnly}
              inputProps={{ style: { fontFamily: 'monospace', fontSize: 12, width: 80 } }}
              placeholder="#rrggbb"
              sx={{ mt: 0.5 }}
            />
          </Box>
        </Box>

        <Divider />

        {/* Flags */}
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={!!draft.isInitial}
                onChange={e => commit({ isInitial: e.target.checked, isFinal: false })}
                disabled={readOnly}
                color="primary"
                size="small"
              />
            }
            label={
              <Typography variant="body2">
                Initial state
                <Typography component="span" variant="caption" color="text.secondary" ml={0.5}>
                  (workflow starts here)
                </Typography>
              </Typography>
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={!!draft.isFinal}
                onChange={e => commit({ isFinal: e.target.checked, isInitial: false })}
                disabled={readOnly}
                color="error"
                size="small"
              />
            }
            label={
              <Typography variant="body2">
                Final / terminal state
                <Typography component="span" variant="caption" color="text.secondary" ml={0.5}>
                  (no further transitions)
                </Typography>
              </Typography>
            }
          />
        </Box>

        {/* Live preview */}
        <Divider />
        <Typography variant="caption" color="text.secondary">
          Node preview
        </Typography>
        <Box
          sx={{
            border: `2px solid ${draft.color ?? '#607D8B'}`,
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: `0 2px 8px ${draft.color ?? '#607D8B'}30`,
          }}
        >
          <Box sx={{ background: draft.color ?? '#607D8B', px: 1.5, py: 0.75 }}>
            <Typography variant="caption" sx={{ color: 'white', fontWeight: 700 }}>
              {draft.label || '…'}
            </Typography>
          </Box>
          <Box sx={{ px: 1.5, py: 0.5, background: '#fafafa' }}>
            <Typography variant="caption" sx={{ color: '#9e9e9e', fontFamily: 'monospace', fontSize: 10 }}>
              {draft.key || '…'}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}
