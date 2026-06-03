/**
 * Marketplace API client.
 *
 * All calls proxy through Vite's dev server (/api → :8080).
 * Authentication uses the same JWT bearer interceptor as workflowApi.ts.
 *
 * TanStack Query hooks are co-located here — components never call axios directly.
 */

import axios from 'axios';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';

// ── Types (mirror MarketplaceResponse.java) ───────────────────────────────────

export interface TemplateSummary {
  id: string;
  slug: string;
  name: string;
  shortDesc: string;
  category: string;
  tags: string[];
  entityTypeHint: string;
  publisherName: string;
  visibleScope: 'PUBLIC' | 'TENANT' | 'UNLISTED';
  installCount: number;
  ratingAvg: number | null;
  ratingCount: number;
  featured: boolean;
  latestSemver: string | null;
  updatedAt: string;
  installedByTenant: boolean;
}

export interface VersionSummary {
  id: string;
  semver: string;
  changelog: string | null;
  latest: boolean;
  publishedAt: string;
}

export interface WorkflowDefinitionSnapshot {
  schemaVersion: number;
  entityType: string;
  version: number;
  label: string;
  description: string;
  states: StateSnapshot[];
  transitions: TransitionSnapshot[];
}

export interface StateSnapshot {
  key: string;
  label: string;
  color: string;
  icon: string;
  isInitial: boolean;
  isFinal: boolean;
  sortOrder: number;
}

export interface TransitionSnapshot {
  key: string;
  label: string;
  fromStateKey: string;
  toStateKey: string;
  requiredPermission: string;
  uiVariant: string;
  sortOrder: number;
  conditions: ConfigSnapshot[];
  actions: ConfigSnapshot[];
}

export interface ConfigSnapshot {
  type: string;
  config: Record<string, unknown>;
  sortOrder: number;
}

export interface VersionDetail extends VersionSummary {
  definition: WorkflowDefinitionSnapshot;
}

export interface TemplateDetail extends TemplateSummary {
  description: string;
  createdAt: string;
  versions: VersionSummary[];
  latestVersion: VersionDetail | null;
}

export interface InstallResult {
  installId: string;
  resultingDefinitionId: string;
  entityType: string;
  label: string;
  templateName: string;
  installedVersion: string;
  installedAt: string;
  designerUrl: string;
}

export interface InstallSummary {
  installId: string;
  templateId: string;
  templateName: string;
  templateSlug: string;
  installedVersion: string;
  resultingDefinitionId: string;
  entityType: string;
  label: string;
  installedAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface InstallRequest {
  versionId?: string;
  customLabel?: string;
  customEntityType?: string;
}

// ── Axios instance (shared with workflowApi) ──────────────────────────────────

const http = axios.create({ baseURL: '/api/v1' });

http.interceptors.request.use(cfg => {
  const token = localStorage.getItem('wf_access_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  cfg.headers['X-Correlation-ID'] = crypto.randomUUID();
  return cfg;
});

// ── Raw API ───────────────────────────────────────────────────────────────────

export const marketplaceApi = {
  listTemplates: (category?: string, page = 0, size = 20): Promise<PageResponse<TemplateSummary>> =>
    http.get('/marketplace/templates', {
      params: { category: category ?? undefined, page, size, sort: 'installCount,desc' },
    }).then(r => r.data),

  listFeatured: (): Promise<TemplateSummary[]> =>
    http.get('/marketplace/templates/featured').then(r => r.data),

  getTemplate: (id: string): Promise<TemplateDetail> =>
    http.get(`/marketplace/templates/${id}`).then(r => r.data),

  getVersions: (id: string): Promise<VersionSummary[]> =>
    http.get(`/marketplace/templates/${id}/versions`).then(r => r.data),

  getVersion: (versionId: string): Promise<VersionDetail> =>
    http.get(`/marketplace/versions/${versionId}`).then(r => r.data),

  install: (templateId: string, req: InstallRequest = {}): Promise<InstallResult> =>
    http.post(`/marketplace/templates/${templateId}/install`, req).then(r => r.data),

  myInstalls: (): Promise<InstallSummary[]> =>
    http.get('/marketplace/my-installs').then(r => r.data),
};

// ── TanStack Query hooks ──────────────────────────────────────────────────────

const KEYS = {
  catalog: (category?: string) => ['marketplace', 'catalog', category ?? 'all'] as const,
  featured:                      ['marketplace', 'featured'] as const,
  template: (id: string)       => ['marketplace', 'template', id] as const,
  versions: (id: string)       => ['marketplace', 'versions', id] as const,
  myInstalls:                    ['marketplace', 'my-installs'] as const,
};

export function useCatalog(category?: string, page = 0) {
  return useQuery({
    queryKey: [...KEYS.catalog(category), page],
    queryFn: () => marketplaceApi.listTemplates(category, page),
    staleTime: 60_000,
    placeholderData: prev => prev,
  });
}

export function useFeaturedTemplates() {
  return useQuery({
    queryKey: KEYS.featured,
    queryFn: marketplaceApi.listFeatured,
    staleTime: 120_000,
  });
}

export function useTemplateDetail(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.template(id ?? ''),
    queryFn: () => marketplaceApi.getTemplate(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useMyInstalls() {
  return useQuery({
    queryKey: KEYS.myInstalls,
    queryFn: marketplaceApi.myInstalls,
    staleTime: 30_000,
  });
}

export function useInstallTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: InstallRequest }) =>
      marketplaceApi.install(id, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace'] });
    },
  });
}
