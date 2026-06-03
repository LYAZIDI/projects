/**
 * TemplateDetailPage — full template detail with graph preview and install flow.
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Breadcrumb + back button                                               │
 * ├──────────────────────────────────┬──────────────────────────────────────┤
 * │  React Flow preview canvas       │  Sidebar:                           │
 * │  (read-only, full graph)         │   - Name, category, tags            │
 * │                                  │   - Install count, rating           │
 * │                                  │   - Version selector                │
 * │                                  │   - Install button + dialog         │
 * │                                  │   - State & transition summary      │
 * ├──────────────────────────────────┴──────────────────────────────────────┤
 * │  Tabs: Description | Versions | States | Transitions | Conditions      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Install flow:
 *  1. User clicks "Install"
 *  2. Dialog asks for customEntityType (pre-filled from hint) + customLabel
 *  3. POST /marketplace/templates/:id/install
 *  4. Success snackbar with "Open in Designer" action → navigate to /designer?definitionId=...
 */

import React, { useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Tooltip from '@mui/material/Tooltip';

import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import StarIcon from '@mui/icons-material/Star';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockIcon from '@mui/icons-material/Lock';

import { PreviewCanvas } from './PreviewCanvas';
import {
  useTemplateDetail,
  useInstallTemplate,
  type VersionSummary,
  type InstallResult,
} from '../api/marketplaceApi';

// ── Component ─────────────────────────────────────────────────────────────────

export function TemplateDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: template, isLoading, isError } = useTemplateDetail(id);
  const installMutation = useInstallTemplate();

  // Tabs
  const [tab, setTab] = useState(0);

  // Version selector
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');

  // Install dialog
  const [installOpen, setInstallOpen]       = useState(false);
  const [customLabel, setCustomLabel]       = useState('');
  const [customEntityType, setEntityType]   = useState('');

  // Post-install snackbar
  const [installResult, setInstallResult]   = useState<InstallResult | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────

  const latestVersion = template?.latestVersion;
  const versions      = template?.versions ?? [];

  // Pick the definition to preview — either the selected version or the latest
  const previewVersion = selectedVersionId
    ? versions.find(v => v.id === selectedVersionId)
    : null;

  const previewDefinition = latestVersion?.definition;   // always preview latest for now

  // ── Handlers ───────────────────────────────────────────────────────────

  const openInstallDialog = () => {
    setCustomLabel(template?.name ?? '');
    setEntityType(template?.entityTypeHint ?? '');
    setInstallOpen(true);
  };

  const handleInstall = async () => {
    if (!id) return;
    setInstallOpen(false);
    try {
      const result = await installMutation.mutateAsync({
        id,
        req: {
          versionId: selectedVersionId || undefined,
          customLabel:      customLabel || undefined,
          customEntityType: customEntityType || undefined,
        },
      });
      setInstallResult(result);
    } catch (err: any) {
      console.error('Install failed', err);
    }
  };

  const openInDesigner = () => {
    if (installResult) {
      navigate(`/designer?definitionId=${installResult.resultingDefinitionId}`);
    }
  };

  // ── Render guards ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !template) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Template not found or access denied.</Alert>
      </Box>
    );
  }

  const isInstalled  = template.installedByTenant;
  const isMutating   = installMutation.isPending;
  const mutateError  = installMutation.error as any;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <Box sx={{ background: '#f8fafc', minHeight: '100vh' }}>

      {/* ── Topbar ─────────────────────────────────────────────────────── */}
      <Box sx={{ background: 'white', borderBottom: '1px solid #e2e8f0', px: { xs: 2, md: 6 }, py: 1.5 }}>
        <Breadcrumbs>
          <RouterLink to="/marketplace" style={{ textDecoration: 'none', color: '#1976d2', fontSize: 14 }}>
            Marketplace
          </RouterLink>
          <Typography fontSize={14} color="text.primary">{template.name}</Typography>
        </Breadcrumbs>
      </Box>

      <Box sx={{ px: { xs: 2, md: 6 }, py: 3 }}>
        <Grid container spacing={3}>

          {/* ── Left: Preview canvas ──────────────────────────────────── */}
          <Grid item xs={12} md={8}>
            <Typography variant="h5" fontWeight={800} gutterBottom>{template.name}</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>{template.shortDesc}</Typography>

            {previewDefinition ? (
              <ReactFlowProvider>
                <PreviewCanvas snapshot={previewDefinition} height={420} />
              </ReactFlowProvider>
            ) : (
              <Box sx={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center',
                         background: '#f1f5f9', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
                <Typography color="text.secondary">No preview available for this template.</Typography>
              </Box>
            )}

            {/* ── Detail tabs ───────────────────────────────────────── */}
            <Paper variant="outlined" sx={{ mt: 3, borderRadius: 2 }}>
              <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid #e2e8f0' }}>
                <Tab label="Description" />
                <Tab label={`States (${previewDefinition?.states.length ?? 0})`} />
                <Tab label={`Transitions (${previewDefinition?.transitions.length ?? 0})`} />
                <Tab label={`Versions (${versions.length})`} />
              </Tabs>

              <Box sx={{ p: 2 }}>
                {/* Description */}
                {tab === 0 && (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                    {template.description || 'No description provided.'}
                  </Typography>
                )}

                {/* States table */}
                {tab === 1 && (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Key</TableCell>
                        <TableCell>Label</TableCell>
                        <TableCell>Color</TableCell>
                        <TableCell>Flags</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(previewDefinition?.states ?? []).sort((a, b) => a.sortOrder - b.sortOrder).map(s => (
                        <TableRow key={s.key}>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{s.key}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: s.color }} />
                              {s.label}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>{s.color}</TableCell>
                          <TableCell>
                            {s.isInitial && <Chip label="initial" size="small" color="primary" sx={{ mr: 0.5, height: 18, fontSize: 10 }} />}
                            {s.isFinal   && <Chip label="final"   size="small" color="error"   sx={{ height: 18, fontSize: 10 }} />}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* Transitions table */}
                {tab === 2 && (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Key</TableCell>
                        <TableCell>Label</TableCell>
                        <TableCell>From → To</TableCell>
                        <TableCell>Permission</TableCell>
                        <TableCell>Cond.</TableCell>
                        <TableCell>Act.</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(previewDefinition?.transitions ?? []).map(t => (
                        <TableRow key={t.key}>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>{t.key}</TableCell>
                          <TableCell>{t.label}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                            {t.fromStateKey} → {t.toStateKey}
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 10 }}>
                            {t.requiredPermission
                              ? <><LockIcon sx={{ fontSize: 11, mr: 0.25 }} />{t.requiredPermission}</>
                              : '—'}
                          </TableCell>
                          <TableCell>{t.conditions.length}</TableCell>
                          <TableCell>{t.actions.length}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* Versions */}
                {tab === 3 && (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Version</TableCell>
                        <TableCell>Changelog</TableCell>
                        <TableCell>Published</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {versions.map((v: VersionSummary) => (
                        <TableRow key={v.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography sx={{ fontFamily: 'monospace' }}>v{v.semver}</Typography>
                              {v.latest && <Chip label="latest" size="small" color="success" sx={{ height: 18, fontSize: 10 }} />}
                            </Box>
                          </TableCell>
                          <TableCell>{v.changelog || '—'}</TableCell>
                          <TableCell>{new Date(v.publishedAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant={selectedVersionId === v.id ? 'contained' : 'outlined'}
                              onClick={() => setSelectedVersionId(v.id === selectedVersionId ? '' : v.id)}
                            >
                              {selectedVersionId === v.id ? 'Selected' : 'Select'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* ── Right: Sidebar ────────────────────────────────────────── */}
          <Grid item xs={12} md={4}>
            <Paper
              variant="outlined"
              sx={{ borderRadius: 2, position: { md: 'sticky' }, top: 80, p: 2 }}
            >
              {/* Category + tags */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
                <Chip label={template.category.toUpperCase()} size="small" color="primary" />
                {template.tags?.map(t => (
                  <Chip key={t} label={t} size="small" variant="outlined" />
                ))}
              </Box>

              {/* Stats */}
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight={700}>{template.installCount.toLocaleString()}</Typography>
                  <Typography variant="caption" color="text.secondary">Installs</Typography>
                </Box>
                {template.ratingAvg != null && (
                  <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                      <StarIcon sx={{ fontSize: 18, color: '#F59E0B' }} />
                      <Typography variant="h6" fontWeight={700}>{Number(template.ratingAvg).toFixed(1)}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">{template.ratingCount} ratings</Typography>
                  </Box>
                )}
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Publisher */}
              <Typography variant="caption" color="text.secondary">Publisher</Typography>
              <Typography variant="body2" fontWeight={600} mb={0.5}>{template.publisherName ?? 'Community'}</Typography>

              <Typography variant="caption" color="text.secondary">Entity type hint</Typography>
              <Typography variant="body2" fontFamily="monospace" mb={0.5}>{template.entityTypeHint || '—'}</Typography>

              <Typography variant="caption" color="text.secondary">Latest version</Typography>
              <Typography variant="body2" fontFamily="monospace" mb={2}>v{template.latestSemver ?? '?'}</Typography>

              {/* Selected version notice */}
              {selectedVersionId && (
                <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
                  Installing version {versions.find(v => v.id === selectedVersionId)?.semver}
                </Alert>
              )}

              {/* Install error */}
              {mutateError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {mutateError?.response?.data?.detail ?? 'Install failed'}
                </Alert>
              )}

              {/* CTA */}
              {isInstalled ? (
                <Button
                  variant="outlined"
                  color="success"
                  fullWidth
                  startIcon={<CheckCircleIcon />}
                  sx={{ mb: 1 }}
                  disabled
                >
                  Installed
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  startIcon={isMutating ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                  onClick={openInstallDialog}
                  disabled={isMutating}
                  disableElevation
                  sx={{ mb: 1 }}
                >
                  {isMutating ? 'Installing…' : 'Install Workflow'}
                </Button>
              )}

              <Button
                variant="text"
                fullWidth
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/marketplace')}
                size="small"
                color="inherit"
              >
                Back to Marketplace
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* ── Install dialog ─────────────────────────────────────────────── */}
      <Dialog open={installOpen} onClose={() => setInstallOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Install Workflow</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          <Typography variant="body2" color="text.secondary">
            A copy of <strong>{template.name}</strong> will be created in your tenant's workspace.
            You can then customise it freely in the Workflow Designer.
          </Typography>

          <TextField
            label="Entity type"
            value={customEntityType}
            onChange={e => setEntityType(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
            fullWidth
            size="small"
            required
            helperText="The entity type this workflow will manage (e.g. lead, leave_request)"
            inputProps={{ style: { fontFamily: 'monospace' } }}
          />

          <TextField
            label="Definition label"
            value={customLabel}
            onChange={e => setCustomLabel(e.target.value)}
            fullWidth
            size="small"
            helperText="Optional — defaults to the template name"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleInstall}
            disabled={!customEntityType.trim()}
          >
            Install
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Post-install snackbar ─────────────────────────────────────── */}
      <Snackbar
        open={!!installResult}
        autoHideDuration={10_000}
        onClose={() => setInstallResult(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          action={
            <Button
              color="inherit"
              size="small"
              endIcon={<OpenInNewIcon />}
              onClick={openInDesigner}
            >
              Open in Designer
            </Button>
          }
          onClose={() => setInstallResult(null)}
        >
          <strong>{installResult?.templateName}</strong> installed as{' '}
          <em>{installResult?.entityType}</em>!
        </Alert>
      </Snackbar>
    </Box>
  );
}
