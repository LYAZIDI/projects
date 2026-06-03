/**
 * useWorkflowGraph — primary designer hook.
 *
 * Orchestrates:
 * 1. Loading a workflow definition from the API → filling the Zustand store
 * 2. Saving the current graph → serializing store → calling API
 * 3. Export / import JSON (browser download / upload)
 *
 * This hook is the bridge between the API layer and the store.
 * Components never call the API directly — they use this hook or the store.
 */

import { useCallback } from 'react';
import { useWorkflowDesignerStore } from '../store/workflowDesignerStore';
import { apiToGraph } from '../mappers/apiToGraph';
import { graphToApi } from '../mappers/graphToApi';
import { workflowApi } from '../../api/workflowApi';
import { useValidation } from './useWorkflowValidation';
import type { ApiWorkflowDefinition } from '../types';

export function useWorkflowGraph() {
  const store = useWorkflowDesignerStore();
  const { validate } = useValidation();

  // ── Load ──────────────────────────────────────────────────────────────────

  /**
   * Load a definition by its backend id.
   * Converts to graph format and populates the store.
   */
  const loadDefinition = useCallback(async (definitionId: string) => {
    const def = await workflowApi.getDefinition(definitionId);
    const { meta, nodes, edges } = apiToGraph(def);
    store.loadGraph(meta, nodes, edges);
    validate(nodes, edges);
  }, [store, validate]);

  /**
   * Start a brand-new definition for a given tenant + entityType.
   * Resets the canvas.
   */
  const newDefinition = useCallback((tenantId: string, entityType: string) => {
    store.resetGraph();
    store.updateMeta({ tenantId, entityType });
  }, [store]);

  // ── Save ──────────────────────────────────────────────────────────────────

  /**
   * Serialize the current graph and save to the API.
   * - CREATE (POST) if no definitionId
   * - UPDATE (PUT) if definitionId present
   *
   * Returns the saved definition (with backend-assigned IDs).
   */
  const saveGraph = useCallback(async (): Promise<ApiWorkflowDefinition | null> => {
    // Run validation before saving
    const issues = validate(store.nodes, store.edges);
    const hasErrors = issues.some(i => i.severity === 'error');
    if (hasErrors) {
      store.setSaveError('Fix validation errors before saving.');
      return null;
    }

    const dto = graphToApi(store.meta, store.nodes, store.edges);
    store.setIsSaving(true);
    store.setSaveError(null);

    try {
      let saved: ApiWorkflowDefinition;
      if (store.meta.definitionId) {
        saved = await workflowApi.updateDefinition(store.meta.definitionId, dto);
      } else {
        saved = await workflowApi.createDefinition(dto);
      }

      // Reload from the saved response to get backend-assigned IDs
      const { meta, nodes, edges } = apiToGraph(saved);
      store.loadGraph(meta, nodes, edges);
      store.markSaved();
      return saved;
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })
          ?.response?.data?.detail ?? 'Save failed';
      store.setSaveError(msg);
      return null;
    } finally {
      store.setIsSaving(false);
    }
  }, [store, validate]);

  // ── Export / Import ───────────────────────────────────────────────────────

  /** Download the current graph as a JSON file (browser). */
  const exportJson = useCallback(() => {
    const dto = graphToApi(store.meta, store.nodes, store.edges);
    const json = JSON.stringify(dto, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${store.meta.entityType || 'workflow'}-v${store.meta.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [store]);

  /**
   * Import a JSON file (drag-drop or file picker).
   * Replaces the current canvas content without saving.
   */
  const importJson = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const dto: ApiWorkflowDefinition = JSON.parse(e.target?.result as string);
        const { meta, nodes, edges } = apiToGraph(dto);
        store.loadGraph(meta, nodes, edges);
        validate(nodes, edges);
      } catch {
        store.setSaveError('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  }, [store, validate]);

  return {
    loadDefinition,
    newDefinition,
    saveGraph,
    exportJson,
    importJson,
  };
}
