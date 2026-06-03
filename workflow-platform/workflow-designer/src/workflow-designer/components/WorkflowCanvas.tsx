/**
 * WorkflowCanvas — the main React Flow canvas.
 *
 * Responsibilities:
 * - Render nodes (StateNode) and edges (TransitionEdge)
 * - Forward React Flow events (drag, connect, select) to the Zustand store
 * - Run validation on every graph change
 * - Show validation issues in a collapsible panel
 * - Toolbar: Add State | Fit View | Zoom In/Out | Toggle Read-only
 * - Mini-map + Controls + Background grid
 *
 * The canvas is intentionally domain-agnostic:
 * it knows nothing about CRM, HR, or any specific workflow.
 */

import React, { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
  type OnConnectEnd,
  type IsValidConnection,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Collapse from '@mui/material/Collapse';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import AddIcon from '@mui/icons-material/Add';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

import { StateNode } from './StateNode';
import { TransitionEdge } from './TransitionEdge';
import {
  useWorkflowDesignerStore,
  hasErrors as hasErrorsSelector,
} from '../store/workflowDesignerStore';
import { useValidation } from '../hooks/useWorkflowValidation';
import type { DesignerNode, DesignerEdge, ValidationSeverity } from '../types';

// ── Custom node / edge type registries ───────────────────────────────────────
// Defined outside component to avoid React Flow re-registration warnings.

const nodeTypes: NodeTypes = { state: StateNode };
const edgeTypes: EdgeTypes = { transition: TransitionEdge };

// ── Validation severity icons ─────────────────────────────────────────────────

const SeverityIcon = ({ s }: { s: ValidationSeverity }) => {
  if (s === 'error')   return <ErrorIcon   fontSize="small" color="error"   />;
  if (s === 'warning') return <WarningIcon fontSize="small" color="warning" />;
  return                      <InfoIcon    fontSize="small" color="info"    />;
};

// ── Canvas ────────────────────────────────────────────────────────────────────

interface WorkflowCanvasProps {
  /** If true, the canvas takes the remaining height after subtracting toolbars */
  fullHeight?: boolean;
}

export function WorkflowCanvas({ fullHeight = true }: WorkflowCanvasProps) {
  const store = useWorkflowDesignerStore();
  const { validate } = useValidation();
  const { fitView } = useReactFlow();

  const [issuesOpen, setIssuesOpen] = React.useState(true);

  const hasErrors = useWorkflowDesignerStore(hasErrorsSelector);
  const issues    = store.validationIssues;
  const readOnly  = store.ui.readOnly;

  // ── Event handlers → store ────────────────────────────────────────────────

  const onNodesChange = useCallback(
    (changes: Parameters<typeof store.onNodesChange>[0]) => {
      store.onNodesChange(changes);
    },
    [store]
  );

  const onEdgesChange = useCallback(
    (changes: Parameters<typeof store.onEdgesChange>[0]) => {
      store.onEdgesChange(changes);
    },
    [store]
  );

  const onConnect = useCallback(
    (connection: Parameters<typeof store.onConnect>[0]) => {
      if (readOnly) return;
      store.onConnect(connection);
    },
    [store, readOnly]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: DesignerNode) => {
      store.selectNode(node.id);
    },
    [store]
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: DesignerEdge) => {
      store.selectEdge(edge.id);
    },
    [store]
  );

  const onPaneClick = useCallback(() => {
    store.selectNode(null);
    store.selectEdge(null);
  }, [store]);

  // Re-run validation whenever nodes or edges change
  const prevNodesRef = useRef<string>('');
  const graphKey = `${store.nodes.length}:${store.edges.length}`;
  if (prevNodesRef.current !== graphKey) {
    prevNodesRef.current = graphKey;
    validate(store.nodes, store.edges);
  }

  // Prevent connecting a node to itself via the UI
  const isValidConnection: IsValidConnection = useCallback(
    connection => connection.source !== connection.target,
    []
  );

  // ── Toolbar actions ───────────────────────────────────────────────────────

  const handleAddState = () => {
    if (readOnly) return;
    // Place new node in the visible center area
    store.addStateNode({ x: 200 + Math.random() * 300, y: 100 + Math.random() * 200 });
  };

  const handleFitView = () => fitView({ padding: 0.1, duration: 400 });

  // ── Render ────────────────────────────────────────────────────────────────

  const errorCount   = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: fullHeight ? '100%' : 600 }}>
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 1.5, py: 0.75,
          background: 'white',
          borderBottom: '1px solid #e0e0e0',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {!readOnly && (
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddState}
            disableElevation
          >
            Add State
          </Button>
        )}

        <Tooltip title="Fit view">
          <IconButton size="small" onClick={handleFitView}>
            <FitScreenIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title={readOnly ? 'Switch to edit mode' : 'Switch to read-only mode'}>
          <IconButton size="small" onClick={() => store.setReadOnly(!readOnly)}>
            {readOnly ? <LockIcon fontSize="small" color="warning" /> : <LockOpenIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        {readOnly && (
          <Chip label="Read-only" size="small" color="warning" variant="outlined" />
        )}

        <Box flex={1} />

        {/* Validation summary chips */}
        {errorCount > 0 && (
          <Chip
            icon={<ErrorIcon />}
            label={`${errorCount} error${errorCount > 1 ? 's' : ''}`}
            size="small"
            color="error"
            variant="filled"
            onClick={() => setIssuesOpen(v => !v)}
          />
        )}
        {warningCount > 0 && (
          <Chip
            icon={<WarningIcon />}
            label={`${warningCount} warning${warningCount > 1 ? 's' : ''}`}
            size="small"
            color="warning"
            variant="outlined"
            onClick={() => setIssuesOpen(v => !v)}
          />
        )}
        {issues.length > 0 && (
          <Tooltip title={issuesOpen ? 'Hide issues' : 'Show issues'}>
            <IconButton size="small" onClick={() => setIssuesOpen(v => !v)}>
              {issuesOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* ── Validation panel ─────────────────────────────────────────────── */}
      <Collapse in={issuesOpen && issues.length > 0}>
        <Box
          sx={{
            maxHeight: 160,
            overflowY: 'auto',
            background: '#fffde7',
            borderBottom: '1px solid #e0e0e0',
            px: 1.5, py: 1,
          }}
        >
          {issues.map(issue => (
            <Box key={issue.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mb: 0.5 }}>
              <SeverityIcon s={issue.severity} />
              <Typography variant="caption" sx={{ lineHeight: 1.4, mt: 0.2 }}>
                {issue.message}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>

      {/* ── React Flow canvas ────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={store.nodes}
          edges={store.edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          isValidConnection={isValidConnection}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={true}
          deleteKeyCode={readOnly ? null : 'Delete'}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          defaultEdgeOptions={{
            type: 'transition',
            markerEnd: { type: 'arrowclosed' },
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e0e0e0" />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={n => (n.data as { color?: string })?.color ?? '#9e9e9e'}
            maskColor="rgba(240,240,240,0.6)"
            style={{ border: '1px solid #e0e0e0' }}
          />
        </ReactFlow>

        {/* Empty state hint */}
        {store.nodes.length === 0 && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              color: '#bdbdbd',
              gap: 1,
            }}
          >
            <Typography variant="h6">No states yet</Typography>
            <Typography variant="body2">
              {readOnly
                ? 'Switch to edit mode to start designing'
                : 'Click "Add State" or drag from the sidebar to begin'}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
