/**
 * TransitionEditor — right-side drawer for editing a WorkflowTransition.
 *
 * Sections:
 *  1. Basic info  (key, label, permission, uiVariant)
 *  2. Conditions  (add / edit / delete ApiConditionConfig)
 *  3. Actions     (add / edit / delete ApiActionConfig)
 *
 * Conditions and actions are configured via a dynamic form generated from
 * the BUILT_IN_CONDITIONS / BUILT_IN_ACTIONS type definitions in types.ts.
 * New plugins are automatically supported by adding to those arrays — no code change here.
 */

import React, { useEffect, useState } from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Tooltip from '@mui/material/Tooltip';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import {
  useWorkflowDesignerStore,
  selectedEdge,
} from '../store/workflowDesignerStore';
import type {
  TransitionEdgeData,
  ApiConditionConfig,
  ApiActionConfig,
  ConditionTypeDef,
  ActionTypeDef,
  ConfigField,
} from '../types';
import {
  BUILT_IN_CONDITIONS,
  BUILT_IN_ACTIONS,
} from '../types';

// ── Variant options ───────────────────────────────────────────────────────────

const UI_VARIANTS = [
  { value: 'default', label: 'Default (grey)' },
  { value: 'primary', label: 'Primary (blue)' },
  { value: 'success', label: 'Success (green)' },
  { value: 'danger',  label: 'Danger (red)' },
  { value: 'warning', label: 'Warning (orange)' },
];

// ── Config field renderer ─────────────────────────────────────────────────────

function ConfigFieldInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: ConfigField;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled: boolean;
}) {
  if (field.type === 'select') {
    return (
      <FormControl size="small" fullWidth>
        <InputLabel>{field.label}</InputLabel>
        <Select
          label={field.label}
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
        >
          {field.options?.map(opt => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  return (
    <TextField
      label={field.label}
      value={(value as string) ?? ''}
      onChange={e => onChange(e.target.value)}
      fullWidth
      size="small"
      disabled={disabled}
      placeholder={field.placeholder}
      required={field.required}
      inputProps={field.type === 'string' ? {} : undefined}
    />
  );
}

// ── Condition item ────────────────────────────────────────────────────────────

function ConditionItem({
  condition,
  onChange,
  onDelete,
  disabled,
}: {
  condition: ApiConditionConfig;
  onChange: (c: ApiConditionConfig) => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const typeDef: ConditionTypeDef | undefined =
    BUILT_IN_CONDITIONS.find(c => c.type === condition.type);

  return (
    <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 1.5, mb: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        {/* Type selector */}
        <FormControl size="small" sx={{ flex: 1, mr: 1 }}>
          <InputLabel>Condition type</InputLabel>
          <Select
            label="Condition type"
            value={condition.type}
            onChange={e =>
              onChange({ ...condition, type: e.target.value as string, config: {} })
            }
            disabled={disabled}
          >
            {BUILT_IN_CONDITIONS.map(cd => (
              <MenuItem key={cd.type} value={cd.type}>{cd.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {!disabled && (
          <IconButton size="small" color="error" onClick={onDelete}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Description */}
      {typeDef && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {typeDef.description}
        </Typography>
      )}

      {/* Config fields */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {(typeDef?.configSchema ?? []).map(field => (
          <ConfigFieldInput
            key={field.key}
            field={field}
            value={condition.config[field.key]}
            onChange={v =>
              onChange({ ...condition, config: { ...condition.config, [field.key]: v } })
            }
            disabled={disabled}
          />
        ))}
      </Box>
    </Box>
  );
}

// ── Action item ───────────────────────────────────────────────────────────────

function ActionItem({
  action,
  onChange,
  onDelete,
  disabled,
}: {
  action: ApiActionConfig;
  onChange: (a: ApiActionConfig) => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const typeDef: ActionTypeDef | undefined =
    BUILT_IN_ACTIONS.find(a => a.type === action.type);

  return (
    <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 1.5, mb: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <FormControl size="small" sx={{ flex: 1, mr: 1 }}>
          <InputLabel>Action type</InputLabel>
          <Select
            label="Action type"
            value={action.type}
            onChange={e =>
              onChange({ ...action, type: e.target.value as string, config: {} })
            }
            disabled={disabled}
          >
            {BUILT_IN_ACTIONS.map(ad => (
              <MenuItem key={ad.type} value={ad.type}>{ad.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {!disabled && (
          <IconButton size="small" color="error" onClick={onDelete}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {typeDef && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {typeDef.description}
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {(typeDef?.configSchema ?? []).map(field => (
          <ConfigFieldInput
            key={field.key}
            field={field}
            value={action.config[field.key]}
            onChange={v =>
              onChange({ ...action, config: { ...action.config, [field.key]: v } })
            }
            disabled={disabled}
          />
        ))}
      </Box>
    </Box>
  );
}

// ── Main drawer ───────────────────────────────────────────────────────────────

export function TransitionEditor() {
  const store    = useWorkflowDesignerStore();
  const edge     = useWorkflowDesignerStore(selectedEdge);
  const open     = !!edge;
  const readOnly = store.ui.readOnly;

  const [draft, setDraft] = useState<Partial<TransitionEdgeData>>({});

  useEffect(() => {
    if (edge?.data) {
      setDraft({ ...edge.data });
    }
  }, [edge?.id]);

  if (!edge) return null;

  const commit = (partial: Partial<TransitionEdgeData>) => {
    const updated = { ...draft, ...partial };
    setDraft(updated);
    store.updateEdgeData(edge.id, updated);
  };

  const addCondition = () => {
    const conditions = [...(draft.conditions ?? []), {
      type: BUILT_IN_CONDITIONS[0].type,
      config: {},
      sortOrder: (draft.conditions?.length ?? 0),
    }];
    commit({ conditions });
  };

  const updateCondition = (idx: number, c: ApiConditionConfig) => {
    const conditions = [...(draft.conditions ?? [])];
    conditions[idx] = c;
    commit({ conditions });
  };

  const removeCondition = (idx: number) => {
    const conditions = (draft.conditions ?? []).filter((_, i) => i !== idx);
    commit({ conditions });
  };

  const addAction = () => {
    const actions = [...(draft.actions ?? []), {
      type: BUILT_IN_ACTIONS[0].type,
      config: {},
      sortOrder: (draft.actions?.length ?? 0),
    }];
    commit({ actions });
  };

  const updateAction = (idx: number, a: ApiActionConfig) => {
    const actions = [...(draft.actions ?? [])];
    actions[idx] = a;
    commit({ actions });
  };

  const removeAction = (idx: number) => {
    const actions = (draft.actions ?? []).filter((_, i) => i !== idx);
    commit({ actions });
  };

  const close = () => store.selectEdge(null);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={close}
      variant="persistent"
      PaperProps={{
        sx: {
          width: 360,
          top: 64,
          height: 'calc(100% - 64px)',
          boxShadow: '-4px 0 16px #0001',
          overflow: 'hidden auto',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', background: '#1976d2', color: 'white' }}>
        <Typography variant="subtitle1" fontWeight={700} flex={1}>
          Edit Transition
        </Typography>
        {!readOnly && (
          <Tooltip title="Delete transition">
            <IconButton
              size="small"
              sx={{ color: 'white', mr: 0.5 }}
              onClick={() => { store.deleteEdge(edge.id); }}
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

        {/* Route */}
        <Box sx={{ background: '#f5f5f5', borderRadius: 1, p: 1, fontFamily: 'monospace', fontSize: 12 }}>
          <Typography variant="caption" color="text.secondary">Route</Typography>
          <br />
          <strong>{draft.fromStateKey}</strong> → <strong>{draft.toStateKey}</strong>
        </Box>

        {/* Basic fields */}
        <TextField
          label="Transition key"
          value={draft.key ?? ''}
          onChange={e => commit({ key: e.target.value.replace(/\s+/g, '_').toLowerCase() })}
          fullWidth size="small" disabled={readOnly}
          inputProps={{ style: { fontFamily: 'monospace' } }}
          helperText="Unique, snake_case identifier (e.g. win, lose, approve)"
        />

        <TextField
          label="Label"
          value={draft.label ?? ''}
          onChange={e => commit({ label: e.target.value })}
          fullWidth size="small" disabled={readOnly}
          helperText="Human-readable label shown on the edge and UI buttons"
        />

        <TextField
          label="Required permission"
          value={draft.requiredPermission ?? ''}
          onChange={e => commit({ requiredPermission: e.target.value })}
          fullWidth size="small" disabled={readOnly}
          inputProps={{ style: { fontFamily: 'monospace' } }}
          helperText="Authority string, e.g. PERM_CRM_WRITE"
          placeholder="PERM_CRM_WRITE"
        />

        <FormControl size="small" fullWidth>
          <InputLabel>UI Variant</InputLabel>
          <Select
            label="UI Variant"
            value={draft.uiVariant ?? 'default'}
            onChange={e => commit({ uiVariant: e.target.value as TransitionEdgeData['uiVariant'] })}
            disabled={readOnly}
          >
            {UI_VARIANTS.map(v => (
              <MenuItem key={v.value} value={v.value}>{v.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Divider />

        {/* Conditions accordion */}
        <Accordion defaultExpanded disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">
              Conditions ({draft.conditions?.length ?? 0})
              <Typography component="span" variant="caption" color="text.secondary" ml={1}>
                ALL must pass
              </Typography>
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {(draft.conditions ?? []).map((cond, idx) => (
              <ConditionItem
                key={idx}
                condition={cond}
                onChange={c => updateCondition(idx, c)}
                onDelete={() => removeCondition(idx)}
                disabled={readOnly}
              />
            ))}
            {!readOnly && (
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={addCondition}
                variant="outlined"
                fullWidth
              >
                Add condition
              </Button>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Actions accordion */}
        <Accordion defaultExpanded disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">
              Actions ({draft.actions?.length ?? 0})
              <Typography component="span" variant="caption" color="text.secondary" ml={1}>
                run in order
              </Typography>
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {(draft.actions ?? []).map((action, idx) => (
              <ActionItem
                key={idx}
                action={action}
                onChange={a => updateAction(idx, a)}
                onDelete={() => removeAction(idx)}
                disabled={readOnly}
              />
            ))}
            {!readOnly && (
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={addAction}
                variant="outlined"
                fullWidth
              >
                Add action
              </Button>
            )}
          </AccordionDetails>
        </Accordion>
      </Box>
    </Drawer>
  );
}
