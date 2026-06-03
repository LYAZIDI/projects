/**
 * AppShell — persistent navigation wrapper for marketplace pages.
 *
 * Provides:
 * - Top app bar with logo, nav links, and "Open Designer" CTA
 * - Outlet for nested routes
 *
 * The designer page is full-screen and renders without this shell.
 */

import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import StorefrontIcon from '@mui/icons-material/Storefront';
import DownloadDoneIcon from '@mui/icons-material/DownloadDone';
import EditIcon from '@mui/icons-material/Edit';

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();

  const isMarketplace = location.pathname.startsWith('/marketplace');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky" elevation={0} color="default"
              sx={{ borderBottom: '1px solid #e2e8f0', background: 'white', zIndex: 1100 }}>
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          {/* Brand */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', mr: 2 }}
            onClick={() => navigate('/marketplace')}
          >
            <StorefrontIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={800} color="primary.main">
              Workflow Platform
            </Typography>
          </Box>

          {/* Nav links */}
          <Button
            variant="text"
            size="small"
            color={isMarketplace ? 'primary' : 'inherit'}
            onClick={() => navigate('/marketplace')}
            sx={{ fontWeight: isMarketplace ? 700 : 400 }}
          >
            Marketplace
          </Button>

          <Button
            variant="text"
            size="small"
            onClick={() => navigate('/marketplace/my-installs')}
          >
            My Installs
          </Button>

          <Box flex={1} />

          {/* Open Designer */}
          <Tooltip title="Open the visual workflow editor">
            <Button
              variant="contained"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => navigate('/designer')}
              disableElevation
            >
              Designer
            </Button>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Page content */}
      <Box sx={{ flex: 1 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
