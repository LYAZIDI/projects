/**
 * WorkflowDesignerPage — top-level page / shell.
 *
 * Layout:
 * ┌────────────────────────────────────────────────────────────────┐
 * │  App Bar: tenant / entityType selector  + Save + Export/Import  │
 * ├─────────────────────────────────┬──────────────────────────────┤
 * │  Canvas (React Flow)            │  StateEditor or              │
 * │  + Toolbar                      │  TransitionEditor            │
 * │  + Validation panel             │  (right-side drawer)         │
 * └─────────────────────────────────┴──────────────────────────────┘
 *
 * The page is query-string driven:
 *   /designer?definitionId=<uuid>         → load existing definition
 *   /designer?tenantId=x&entityType=y     → new definition
 */

import React, { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import SaveIcon from '@mui/icons-material/Save';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import ListIcon from '@mui/icons-material/List';

import { WorkflowCanvas } from './components/WorkflowCanvas';
import { StateEditor } from './components/StateEditor';
import { TransitionEditor } from './components/TransitionEditor';
import { DefinitionListDialog } from './components/DefinitionListDialog';
import { useWorkflowDesignerStore, hasErrors } from './store/workflowDesignerStore';
import { useWorkflowGraph } from './hooks/useWorkflowGraph';

export function WorkflowDesignerPage() {
  const [params]         = useSearchParams();
  const store            = useWorkflowDesignerStore();
  const { loadDefinition, newDefinition, saveGraph, exportJson, importJson } = useWorkflowGraph();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [listOpen, setListOpen] = React.useState(false);

  const isBlocking = useWorkflowDesignerStore(hasErrors);

  // ── Bootstrap from query params ───────────────────────────────────────────

  useEffect(() => {
    const defId      = params.get('definitionId');
    const tenantId   = params.get('tenantId')   ?? 'demo';
    const entityType = params.get('entityType') ?? '';

    if (defId) {
      loadDefinition(defId);
    } else {
      newDefinition(tenantId, entityType);
    }
  }, []); // intentionally run once on mount

  // ── File import ───────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importJson(file);
    e.target.value = '';   // reset so the same file can be re-imported
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    await saveGraph();
  };

  const isDirty  = store.ui.isDirty;
  const isSaving = store.ui.isSaving;
  const saveError = store.ui.saveError;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* ── App Bar ──────────────────────────────────────────────────────── */}
      <AppBar position="static" elevation={1} color="default">
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          {/* Logo / Title */}
          <Typography variant="h6" fontWeight={700} sx={{ mr: 1, fontSize: 16 }}>
            Workflow Designer
          </Typography>

          {/* Tenant */}
          <TextField
            label="Tenant ID"
            value={store.meta.tenantId}
            onChange={e => store.updateMeta({ tenantId: e.target.value })}
            size="small"
            sx={{ width: 160 }}
            disabled={store.ui.readOnly}
          />

          {/* Entity type */}
          <TextField
            label="Entity type"
            value={store.meta.entityType}
            onChange={e => store.updateMeta({ entityType: e.target.value.toLowerCase() })}
            size="small"
            sx={{ width: 140 }}
            disabled={store.ui.readOnly}
            placeholder="lead, quote, …"
          />

          {/* Definition label */}
          <TextField
            label="Label"
            value={store.meta.label}
            onChange={e => store.updateMeta({ label: e.target.value })}
            size="small"
            sx={{ width: 200 }}
            disabled={store.ui.readOnly}
          />

          {/* Dirty indicator */}
          {isDirty && (
            <Chip label="Unsaved" size="small" color="warning" variant="outlined" />
          )}

          <Box flex={1} />

          {/* List definitions */}
          <Tooltip title="Open existing definition">
            <IconButton size="small" onClick={() => setListOpen(true)}>
              <ListIcon />
            </IconButton>
          </Tooltip>

          {/* Import */}
          <Tooltip title="Import JSON">
            <IconButton size="small" onClick={() => fileInputRef.current?.click()}>
              <FileUploadIcon />
            </IconButton>
          </Tooltip>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {/* Export */}
          <Tooltip title="Export JSON">
            <IconButton size="small" onClick={exportJson}>
              <FileDownloadIcon />
            </IconButton>
          </Tooltip>

          {/* Save */}
          <Button
            variant="contained"
            size="small"
            startIcon={isSaving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={isSaving || isBlocking || !isDirty || store.ui.readOnly}
            disableElevation
            color={isBlocking ? 'error' : 'primary'}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </Toolbar>
      </AppBar>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* Canvas (fills remaining space, shrinks when a drawer is open) */}
        <Box
          sx={{
            flex: 1,
            overflow: 'hidden',
            transition: 'margin-right 0.2s ease',
            // Shift left when drawer is open
            marginRight:
              store.ui.selectedNodeId ? '320px' :
              store.ui.selectedEdgeId ? '360px' : 0,
          }}
        >
          <WorkflowCanvas fullHeight />
        </Box>

        {/* Right drawers (positioned absolute inside the body, not covering the AppBar) */}
        <StateEditor />
        <TransitionEditor />
      </Box>

      {/* ── Dialogs / Snackbars ───────────────────────────────────────────── */}

      <DefinitionListDialog
        open={listOpen}
        onClose={() => setListOpen(false)}
        onSelect={id => {
          setListOpen(false);
          loadDefinition(id);
        }}
      />

      <Snackbar
        open={!!saveError}
        autoHideDuration={6000}
        onClose={() => store.setSaveError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => store.setSaveError(null)}>
          {saveError}
        </Alert>
      </Snackbar>
    </Box>
  );
}
