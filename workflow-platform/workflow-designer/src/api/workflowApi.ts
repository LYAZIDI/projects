/**
 * Workflow API client.
 *
 * All calls go through this module — the rest of the app never uses axios directly.
 * TanStack Query hooks are co-located here to keep the API surface in one place.
 *
 * Authentication: the JWT is stored in localStorage under "wf_access_token"
 * and injected via the axios interceptor below.
 */

import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ApiWorkflowDefinition,
} from '../workflow-designer/types';

// ── Axios instance ────────────────────────────────────────────────────────────

const http = axios.create({ baseURL: '/api/v1' });

http.interceptors.request.use(config => {
  const token = localStorage.getItem('wf_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Correlation-ID'] = crypto.randomUUID();
  return config;
});

// Intercept 401 → clear token
http.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) localStorage.removeItem('wf_access_token');
    return Promise.reject(err);
  }
);

// ── Raw API functions ─────────────────────────────────────────────────────────

export const workflowApi = {
  /** List all definitions for the tenant (requires PERM_WORKFLOW_READ). */
  listDefinitions: (): Promise<ApiWorkflowDefinition[]> =>
    http.get('/workflow/definitions').then(r => r.data),

  /** Fetch a single definition with all states, transitions, conditions, actions. */
  getDefinition: (id: string): Promise<ApiWorkflowDefinition> =>
    http.get(`/workflow/definitions/${id}`).then(r => r.data),

  /**
   * Create a brand-new workflow definition.
   * Returns the persisted definition (with generated IDs).
   */
  createDefinition: (dto: ApiWorkflowDefinition): Promise<ApiWorkflowDefinition> =>
    http.post('/workflow/definitions', dto).then(r => r.data),

  /**
   * Replace an existing definition (full PUT — engine validates no in-flight instances
   * are blocked by state removal).
   */
  updateDefinition: (
    id: string,
    dto: ApiWorkflowDefinition
  ): Promise<ApiWorkflowDefinition> =>
    http.put(`/workflow/definitions/${id}`, dto).then(r => r.data),

  /** Soft-deactivate a definition (instances keep their state). */
  deactivateDefinition: (id: string): Promise<void> =>
    http.delete(`/workflow/definitions/${id}`).then(() => undefined),

  /**
   * List transitions available for a concrete entity instance.
   * Used by the "preview" panel in the designer.
   */
  getAvailableTransitions: (entityType: string, entityId: string) =>
    http
      .get(`/workflow/${entityType}/${entityId}/transitions`)
      .then(r => r.data as Array<{ key: string; label: string; toState: string; uiVariant: string }>),
};

// ── TanStack Query hooks ──────────────────────────────────────────────────────

const KEYS = {
  definitions: ['workflow', 'definitions'] as const,
  definition: (id: string) => ['workflow', 'definitions', id] as const,
};

export function useDefinitions() {
  return useQuery({
    queryKey: KEYS.definitions,
    queryFn: workflowApi.listDefinitions,
    staleTime: 30_000,
  });
}

export function useDefinition(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.definition(id ?? ''),
    queryFn: () => workflowApi.getDefinition(id!),
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useCreateDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workflowApi.createDefinition,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.definitions }),
  });
}

export function useUpdateDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ApiWorkflowDefinition }) =>
      workflowApi.updateDefinition(id, dto),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.definitions });
      qc.invalidateQueries({ queryKey: KEYS.definition(id) });
    },
  });
}
