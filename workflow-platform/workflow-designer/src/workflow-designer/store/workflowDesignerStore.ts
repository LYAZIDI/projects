/**
 * Workflow Designer — Zustand store.
 *
 * Single source of truth for the designer session:
 *   - the graph (nodes + edges)
 *   - definition metadata
 *   - UI state (selection, panel open, read-only mode, dirty flag)
 *
 * Uses Immer for ergonomic immutable updates (produce pattern built into Zustand).
 *
 * The store is intentionally NOT aware of the backend API.
 * Saves are orchestrated by useWorkflowGraph, which reads the store and
 * calls the API layer.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import type {
  Connection,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import type {
  DesignerNode,
  DesignerEdge,
  DesignerMeta,
  StateNodeData,
  TransitionEdgeData,
  ValidationIssue,
} from '../types';
import { createStateNode, createTransitionEdge } from '../utils/graphFactories';

// ── State shape ───────────────────────────────────────────────────────────────

interface DesignerUIState {
  /** Whether the designer is in read-only / viewer mode */
  readOnly: boolean;
  /** True when graph diverges from last-saved state */
  isDirty: boolean;
  /** Node id currently selected (opens StateEditor drawer) */
  selectedNodeId: string | null;
  /** Edge id currently selected (opens TransitionEditor drawer) */
  selectedEdgeId: string | null;
  /** True while a save is in flight */
  isSaving: boolean;
  /** Last save error message */
  saveError: string | null;
}

interface WorkflowDesignerState {
  // Data
  meta: DesignerMeta;
  nodes: DesignerNode[];
  edges: DesignerEdge[];
  validationIssues: ValidationIssue[];

  // UI
  ui: DesignerUIState;

  // ── Graph mutation actions ─────────────────────────────────────────────────

  /** Called by React Flow's onNodesChange (drag, select, delete…) */
  onNodesChange: (changes: NodeChange<DesignerNode>[]) => void;

  /** Called by React Flow's onEdgesChange (select, delete…) */
  onEdgesChange: (changes: EdgeChange<DesignerEdge>[]) => void;

  /** Called when the user drops a connection between two nodes */
  onConnect: (connection: Connection) => void;

  /** Add a brand-new state node at a given position */
  addStateNode: (position?: { x: number; y: number }) => void;

  /** Update a node's data (from StateEditor) */
  updateNodeData: (nodeId: string, data: Partial<StateNodeData>) => void;

  /** Update an edge's data (from TransitionEditor) */
  updateEdgeData: (edgeId: string, data: Partial<TransitionEdgeData>) => void;

  /** Delete a node and all edges connected to it */
  deleteNode: (nodeId: string) => void;

  /** Delete an edge */
  deleteEdge: (edgeId: string) => void;

  // ── Definition metadata actions ────────────────────────────────────────────

  updateMeta: (meta: Partial<DesignerMeta>) => void;

  // ── Bulk graph operations ──────────────────────────────────────────────────

  /**
   * Load a full graph from the mapper (called after fetching definition from API).
   * Clears dirty flag.
   */
  loadGraph: (
    meta: DesignerMeta,
    nodes: DesignerNode[],
    edges: DesignerEdge[]
  ) => void;

  /** Reset to empty canvas */
  resetGraph: () => void;

  // ── UI actions ─────────────────────────────────────────────────────────────

  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  setReadOnly: (value: boolean) => void;
  setIsSaving: (value: boolean) => void;
  setSaveError: (msg: string | null) => void;
  markSaved: () => void;

  // ── Validation ─────────────────────────────────────────────────────────────

  setValidationIssues: (issues: ValidationIssue[]) => void;
}

// ── Default meta ─────────────────────────────────────────────────────────────

const defaultMeta: DesignerMeta = {
  definitionId: undefined,
  tenantId: '',
  entityType: '',
  version: 1,
  label: 'New Workflow',
  description: '',
  active: true,
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useWorkflowDesignerStore = create<WorkflowDesignerState>()(
  immer((set, get) => ({
    meta: { ...defaultMeta },
    nodes: [],
    edges: [],
    validationIssues: [],

    ui: {
      readOnly: false,
      isDirty: false,
      selectedNodeId: null,
      selectedEdgeId: null,
      isSaving: false,
      saveError: null,
    },

    // ── Graph mutations ──────────────────────────────────────────────────────

    onNodesChange: changes => {
      set(state => {
        state.nodes = applyNodeChanges(changes, state.nodes) as DesignerNode[];
        state.ui.isDirty = true;
      });
    },

    onEdgesChange: changes => {
      set(state => {
        state.edges = applyEdgeChanges(changes, state.edges) as DesignerEdge[];
        state.ui.isDirty = true;
      });
    },

    onConnect: connection => {
      set(state => {
        const fromKey = state.nodes.find(n => n.id === connection.source)?.data.key ?? connection.source!;
        const toKey   = state.nodes.find(n => n.id === connection.target)?.data.key ?? connection.target!;
        const edge    = createTransitionEdge(connection.source!, connection.target!, fromKey, toKey);
        state.edges = addEdge(edge, state.edges) as DesignerEdge[];
        state.ui.isDirty = true;
        // Auto-open transition editor for the new edge
        state.ui.selectedEdgeId = edge.id;
        state.ui.selectedNodeId = null;
      });
    },

    addStateNode: (position = { x: 200 + Math.random() * 300, y: 150 + Math.random() * 200 }) => {
      set(state => {
        const node = createStateNode(position);
        state.nodes.push(node);
        state.ui.isDirty = true;
        // Auto-open state editor
        state.ui.selectedNodeId = node.id;
        state.ui.selectedEdgeId = null;
      });
    },

    updateNodeData: (nodeId, data) => {
      set(state => {
        const node = state.nodes.find(n => n.id === nodeId);
        if (!node) return;

        // If setting isInitial, clear it on all other nodes first
        if (data.isInitial) {
          state.nodes.forEach(n => { n.data.isInitial = false; });
        }

        Object.assign(node.data, data);
        state.ui.isDirty = true;
      });
    },

    updateEdgeData: (edgeId, data) => {
      set(state => {
        const edge = state.edges.find(e => e.id === edgeId);
        if (!edge) return;
        Object.assign(edge.data!, data);
        // Keep edge label in sync
        if (data.label !== undefined) edge.label = data.label;
        state.ui.isDirty = true;
      });
    },

    deleteNode: nodeId => {
      set(state => {
        state.nodes = state.nodes.filter(n => n.id !== nodeId);
        state.edges = state.edges.filter(
          e => e.source !== nodeId && e.target !== nodeId
        );
        if (state.ui.selectedNodeId === nodeId) state.ui.selectedNodeId = null;
        state.ui.isDirty = true;
      });
    },

    deleteEdge: edgeId => {
      set(state => {
        state.edges = state.edges.filter(e => e.id !== edgeId);
        if (state.ui.selectedEdgeId === edgeId) state.ui.selectedEdgeId = null;
        state.ui.isDirty = true;
      });
    },

    // ── Meta ──────────────────────────────────────────────────────────────────

    updateMeta: partial => {
      set(state => {
        Object.assign(state.meta, partial);
        state.ui.isDirty = true;
      });
    },

    // ── Bulk ──────────────────────────────────────────────────────────────────

    loadGraph: (meta, nodes, edges) => {
      set(state => {
        state.meta = meta;
        state.nodes = nodes;
        state.edges = edges;
        state.validationIssues = [];
        state.ui.isDirty = false;
        state.ui.selectedNodeId = null;
        state.ui.selectedEdgeId = null;
        state.ui.saveError = null;
      });
    },

    resetGraph: () => {
      set(state => {
        state.meta = { ...defaultMeta };
        state.nodes = [];
        state.edges = [];
        state.validationIssues = [];
        state.ui.isDirty = false;
        state.ui.selectedNodeId = null;
        state.ui.selectedEdgeId = null;
        state.ui.saveError = null;
      });
    },

    // ── UI ────────────────────────────────────────────────────────────────────

    selectNode: id => set(state => {
      state.ui.selectedNodeId = id;
      state.ui.selectedEdgeId = null;
    }),

    selectEdge: id => set(state => {
      state.ui.selectedEdgeId = id;
      state.ui.selectedNodeId = null;
    }),

    setReadOnly: value => set(state => { state.ui.readOnly = value; }),
    setIsSaving: value => set(state => { state.ui.isSaving = value; }),
    setSaveError: msg  => set(state => { state.ui.saveError = msg; }),
    markSaved:  ()     => set(state => { state.ui.isDirty = false; state.ui.saveError = null; }),

    setValidationIssues: issues => set(state => { state.validationIssues = issues; }),
  }))
);

// ── Selectors (memoized) ──────────────────────────────────────────────────────

export const selectedNode = (s: WorkflowDesignerState) =>
  s.nodes.find(n => n.id === s.ui.selectedNodeId) ?? null;

export const selectedEdge = (s: WorkflowDesignerState) =>
  s.edges.find(e => e.id === s.ui.selectedEdgeId) ?? null;

export const hasErrors = (s: WorkflowDesignerState) =>
  s.validationIssues.some(i => i.severity === 'error');
