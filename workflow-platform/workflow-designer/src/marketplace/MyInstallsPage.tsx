/**
 * MyInstallsPage — lists all workflows the current tenant has installed
 * from the marketplace, with a direct link to open each in the designer.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import StorefrontIcon from '@mui/icons-material/Storefront';

import { useMyInstalls } from '../api/marketplaceApi';

export function MyInstallsPage() {
  const navigate = useNavigate();
  const { data: installs = [], isLoading, isError } = useMyInstalls();

  return (
    <Box sx={{ background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ background: 'white', borderBottom: '1px solid #e2e8f0', px: { xs: 2, md: 6 }, py: 2,
                 display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton size="small" onClick={() => navigate('/marketplace')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight={700}>My Installs</Typography>
        <Chip label={`${installs.length} workflow${installs.length !== 1 ? 's' : ''}`}
              size="small" color="primary" variant="outlined" />
      </Box>

      <Box sx={{ px: { xs: 2, md: 6 }, py: 3, maxWidth: 1100, mx: 'auto' }}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {isError && <Alert severity="error">Failed to load installs.</Alert>}

        {!isLoading && installs.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <StorefrontIcon sx={{ fontSize: 56, color: '#e0e0e0', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">No workflows installed yet</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Browse the marketplace and install ready-made workflows for your tenant.
            </Typography>
            <Button variant="contained" disableElevation onClick={() => navigate('/marketplace')}>
              Browse Marketplace
            </Button>
          </Box>
        )}

        {!isLoading && installs.length > 0 && (
          <Paper variant="outlined" sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ background: '#f8fafc' }}>
                  <TableCell>Workflow</TableCell>
                  <TableCell>Entity Type</TableCell>
                  <TableCell>Source Template</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Installed</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {installs.map(install => (
                  <TableRow key={install.installId} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{install.label}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" fontSize={12}>
                        {install.entityType}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="text"
                        size="small"
                        sx={{ textTransform: 'none', p: 0, minWidth: 0 }}
                        onClick={() => navigate(`/marketplace/${install.templateId}`)}
                      >
                        {install.templateName}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`v${install.installedVersion}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontFamily: 'monospace', fontSize: 11 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(install.installedAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Open in Workflow Designer">
                        <Button
                          size="small"
                          variant="outlined"
                          endIcon={<OpenInNewIcon fontSize="small" />}
                          onClick={() =>
                            navigate(`/designer?definitionId=${install.resultingDefinitionId}`)
                          }
                        >
                          Open
                        </Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
